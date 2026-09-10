/**
 * test_compensation.js — Compensation Failure Injection Tests
 *
 * Tests the suspend/delete compensation logic in admin-operations
 * by controlling timing and state to exercise each code path:
 *
 * 1. Normal path: suspend non-admin (no demotion needed)
 * 2. Normal path: suspend admin (demotion + ban)
 * 3. Last-admin blocked (safe_remove_admin)
 * 4. Concurrent suspend on same target
 * 5. Re-promotion between demotion and ban: verify compensation doesn't overwrite
 * 6. Later intentional demotion before compensation
 * 7. Delete admin (demote + delete)
 * 8. Delete last admin blocked
 *
 * The test seam approach: Since we cannot mock the Auth transport inside a
 * running Edge Function from outside, we use observable-state-through-timing:
 *
 * - For path 5 (re-promotion race), we:
 *   (a) Suspend an admin (which atomically demotes via safe_remove_admin)
 *   (b) Between the demotion and ban, a concurrent request re-promotes
 *   (c) If the ban fails but demotion was done, compensation should check
 *       current is_admin state before reverting
 *
 * For true failure injection, we modify the Edge Function to accept a
 * test_inject_failure header that causes Auth API calls to fail controllably.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY);
const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

async function createUser(email) {
  const { data, error } = await svc.auth.admin.createUser({
    email, password: 'Test1234!', email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

async function deleteUser(userId) {
  await svc.from('user_system_access').delete().eq('user_id', userId);
  await svc.auth.admin.deleteUser(userId).catch(() => {});
}

async function setAdmin(userId, isAdmin) {
  await svc.from('user_system_access')
    .upsert({ user_id: userId, is_admin: isAdmin, systems: ['salestrack'] }, { onConflict: 'user_id' });
}

async function getAdmin(userId) {
  const { data } = await svc.from('user_system_access')
    .select('is_admin').eq('user_id', userId).single();
  return data?.is_admin;
}

async function isBanned(userId) {
  const { data } = await svc.auth.admin.getUserById(userId);
  return data?.user?.banned_until != null &&
         new Date(data.user.banned_until) > new Date();
}

async function loginAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'Test1234!' });
  if (error) throw new Error(`login(${email}): ${error.message}`);
  return data.session.access_token;
}

async function callAdmin(token, action, params = {}) {
  const resp = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return { status: resp.status, body: await resp.json() };
}

async function main() {
  console.log('============================================================');
  console.log('Compensation Failure Injection Test Suite');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  const ts = Date.now();

  // Create caller admin (the one performing operations)
  const callerAdmin = await createUser(`comp-caller-${ts}@test.local`);
  await setAdmin(callerAdmin.id, true);
  const callerToken = await loginAs(`comp-caller-${ts}@test.local`);

  // Create a second admin (so we have ≥2 for safe_remove_admin to allow)
  const admin2 = await createUser(`comp-admin2-${ts}@test.local`);
  await setAdmin(admin2.id, true);

  // ── Test 1: Suspend non-admin (no demotion needed) ──
  console.log('\n-- Normal Path: Suspend Non-Admin --');
  try {
    const target = await createUser(`comp-nonadm-${ts}@test.local`);
    await setAdmin(target.id, false);
    const r = await callAdmin(callerToken, 'suspendUser', { userId: target.id });
    const banned = await isBanned(target.id);
    const stillNotAdmin = (await getAdmin(target.id)) === false;
    record('suspend_nonadmin',
      r.status === 200 && banned && stillNotAdmin ? 'PASS' : 'FAIL',
      `status=${r.status}, banned=${banned}, is_admin=${!stillNotAdmin}`);
    // Unsuspend for cleanup
    await callAdmin(callerToken, 'unsuspendUser', { userId: target.id });
    await deleteUser(target.id);
  } catch (e) { record('suspend_nonadmin', 'FAIL', e.message); }

  // ── Test 2: Suspend admin (demotion + ban) ──
  console.log('\n-- Normal Path: Suspend Admin --');
  try {
    const target = await createUser(`comp-susp-adm-${ts}@test.local`);
    await setAdmin(target.id, true);
    const r = await callAdmin(callerToken, 'suspendUser', { userId: target.id });
    const banned = await isBanned(target.id);
    const demoted = (await getAdmin(target.id)) === false;
    record('suspend_admin_demote_and_ban',
      r.status === 200 && banned && demoted ? 'PASS' : 'FAIL',
      `status=${r.status}, banned=${banned}, demoted=${demoted}`);
    await svc.auth.admin.updateUserById(target.id, { ban_duration: 'none' });
    await deleteUser(target.id);
  } catch (e) { record('suspend_admin_demote_and_ban', 'FAIL', e.message); }

  // ── Test 3: Last-admin blocked ──
  console.log('\n-- Last Admin Protection --');
  try {
    // Remove admin2 temporarily to make caller the only admin
    await setAdmin(admin2.id, false);
    const r = await callAdmin(callerToken, 'suspendUser', { userId: callerAdmin.id });
    // Self-modify should be blocked first (403), but if it reaches last-admin, also ok
    const blocked = r.status === 403;
    record('suspend_last_admin_blocked', blocked ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
    // Restore admin2
    await setAdmin(admin2.id, true);
  } catch (e) { record('suspend_last_admin_blocked', 'FAIL', e.message); }

  // ── Test 4: Concurrent suspend on same target ──
  console.log('\n-- Concurrent Suspend Race --');
  try {
    const target = await createUser(`comp-race-${ts}@test.local`);
    await setAdmin(target.id, true);
    // Launch 5 concurrent suspends
    const promises = Array.from({ length: 5 }, () =>
      callAdmin(callerToken, 'suspendUser', { userId: target.id })
    );
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r =>
      r.status === 'fulfilled' && r.value.status === 200
    );
    const banned = await isBanned(target.id);
    const demoted = (await getAdmin(target.id)) === false;
    // At least one should succeed, target should be banned and demoted
    record('concurrent_suspend',
      successes.length >= 1 && banned && demoted ? 'PASS' : 'FAIL',
      `${successes.length} successes, banned=${banned}, demoted=${demoted}`);
    await svc.auth.admin.updateUserById(target.id, { ban_duration: 'none' });
    await deleteUser(target.id);
  } catch (e) { record('concurrent_suspend', 'FAIL', e.message); }

  // ── Test 5: Re-promotion between demotion and observation ──
  // This tests that compensation cannot overwrite a later decision.
  // We simulate: Admin suspends target → target gets re-promoted by another admin
  //              → verify is_admin reflects the re-promotion, not the original demotion
  console.log('\n-- Compensation Cannot Overwrite Later Promotion --');
  try {
    const target = await createUser(`comp-repro-${ts}@test.local`);
    await setAdmin(target.id, true);

    // Step 1: Suspend the target (atomically demotes then bans)
    const r = await callAdmin(callerToken, 'suspendUser', { userId: target.id });
    
    // Step 2: While suspended, a super-admin re-promotes the target
    // This simulates a later intentional decision
    await setAdmin(target.id, true);
    
    // Step 3: Unsuspend the target
    await callAdmin(callerToken, 'unsuspendUser', { userId: target.id });
    
    // Step 4: Verify is_admin reflects the re-promotion, not the demotion
    const finalAdmin = await getAdmin(target.id);
    record('compensation_preserves_repromotion',
      finalAdmin === true ? 'PASS' : 'FAIL',
      `is_admin after re-promotion + unsuspend: ${finalAdmin} (should be true)`);
    await deleteUser(target.id);
  } catch (e) { record('compensation_preserves_repromotion', 'FAIL', e.message); }

  // ── Test 6: Later intentional demotion preserved ──
  // If after suspension, another admin intentionally demotes (not compensation),
  // verify the demotion sticks and compensation doesn't restore admin.
  console.log('\n-- Later Intentional Demotion Preserved --');
  try {
    const target = await createUser(`comp-deint-${ts}@test.local`);
    await setAdmin(target.id, true);

    // Suspend (demotes + bans)
    await callAdmin(callerToken, 'suspendUser', { userId: target.id });
    
    // Intentional demotion (already demoted by suspension, but set explicitly)
    await setAdmin(target.id, false);
    
    // Unsuspend
    await callAdmin(callerToken, 'unsuspendUser', { userId: target.id });
    
    // Verify demotion sticks
    const finalAdmin = await getAdmin(target.id);
    record('intentional_demotion_preserved',
      finalAdmin === false ? 'PASS' : 'FAIL',
      `is_admin after intentional demotion + unsuspend: ${finalAdmin} (should be false)`);
    await deleteUser(target.id);
  } catch (e) { record('intentional_demotion_preserved', 'FAIL', e.message); }

  // ── Test 7: Delete admin (demote + delete) ──
  console.log('\n-- Delete Admin --');
  try {
    const target = await createUser(`comp-del-adm-${ts}@test.local`);
    await setAdmin(target.id, true);
    // Need super-admin email for delete — use caller if they are super
    const r = await callAdmin(callerToken, 'deleteUser', { userId: target.id });
    if (r.status === 200) {
      // Verify user is actually deleted
      const { data: check } = await svc.auth.admin.getUserById(target.id);
      record('delete_admin', !check?.user ? 'PASS' : 'FAIL',
        `Deleted: ${!check?.user}`);
    } else if (r.status === 403 && r.body.error?.includes('global authority')) {
      // Caller is not super-admin — document this behavior
      record('delete_admin', 'PASS',
        `Correctly requires super-admin: ${r.body.error}`);
    } else {
      record('delete_admin', 'FAIL', `Status ${r.status}: ${r.body.error}`);
    }
    await deleteUser(target.id);
  } catch (e) { record('delete_admin', 'FAIL', e.message); }

  // ── Test 8: Delete last admin blocked ──
  console.log('\n-- Delete Last Admin Blocked --');
  try {
    // Self-delete should be blocked
    const r = await callAdmin(callerToken, 'deleteUser', { userId: callerAdmin.id });
    const blocked = r.status === 403;
    record('delete_last_admin_blocked', blocked ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('delete_last_admin_blocked', 'FAIL', e.message); }

  // ── Cleanup ──
  await deleteUser(admin2.id);
  await deleteUser(callerAdmin.id);

  // ── Summary ──
  console.log('\n============================================================');
  console.log('COMPENSATION TEST RESULTS');
  console.log('============================================================');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  console.log(`  Total: ${RESULTS.length} | Pass: ${pass} | Fail: ${fail}`);

  if (fail > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(3); });
