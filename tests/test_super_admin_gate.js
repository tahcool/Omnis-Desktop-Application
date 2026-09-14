/**
 * test_super_admin_gate.js — Regression tests for super-admin authorization gate
 *
 * Tests the fix where super-admin callers (in SUPER_ADMIN_EMAILS) without a
 * user_system_access row were incorrectly rejected by the authorization gate.
 *
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY env vars
 * Requires: Edge Functions served locally
 *
 * Test suites:
 *   A. Non-super-admin denied/allowed (existing)
 *   B. Scoped admin restrictions (existing)
 *   C. Self-modification prevention (existing)
 *   D. Edit User Access flow (existing)
 *   E. Super-admin with NO access row: getUsers, updateUserAccess, makeAdmin, removeAdmin
 *   F. Super-admin with is_admin=false row: same operations
 *   G. Protected targets: super-admin email cannot be demoted/deleted
 *   H. Last-admin protection: safe_remove_admin RPC and trigger
 *   I. Audit trail verification (existing + expanded)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// ── Pre-flight safety checks ─────────────────────────────────────────
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('ABORT: Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  console.error('ABORT: SUPABASE_URL is not local:', SUPABASE_URL);
  process.exit(1);
}
try {
  const payload = JSON.parse(Buffer.from(ANON_KEY.split('.')[1], 'base64').toString());
  if (payload.iss !== 'supabase-demo') {
    console.error('ABORT: JWT issuer is not supabase-demo:', payload.iss);
    process.exit(1);
  }
} catch (e) {
  console.error('ABORT: Cannot decode ANON_KEY JWT:', e.message);
  process.exit(1);
}

// Super-admin emails from admin-config.ts (used only for local test users)
const SUPER_ADMIN_EMAIL_1 = 'takunda@industrial-exchange.group';
const SUPER_ADMIN_EMAIL_2 = 'zaranyika.rt@gmail.com';
const TEST_PASSWORD = 'Test1234!';

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

// ── Helpers ──────────────────────────────────────────────────────────

async function createTestUser(email, password = TEST_PASSWORD) {
  // Delete existing user with this email first (local disposable DB only)
  const { data: existing } = await serviceClient.auth.admin.listUsers();
  const match = existing?.users?.find(u => u.email === email);
  if (match) {
    try { await serviceClient.from('user_system_access').delete().eq('user_id', match.id); } catch (_) {}
    try { await serviceClient.auth.admin.deleteUser(match.id); } catch (_) {}
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

async function deleteTestUser(userId) {
  try { await serviceClient.from('user_system_access').delete().eq('user_id', userId); } catch (_) {}
  try { await serviceClient.auth.admin.deleteUser(userId); } catch (_) {}
}

async function removeAccessRow(userId) {
  await serviceClient.from('user_system_access').delete().eq('user_id', userId);
}

async function setAccess(userId, isAdmin, systems) {
  const { error } = await serviceClient
    .from('user_system_access')
    .upsert({ user_id: userId, is_admin: isAdmin, systems }, { onConflict: 'user_id' });
  if (error) throw new Error(`setAccess(${userId}): ${error.message}`);
}

async function loginUser(email, password = TEST_PASSWORD) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login(${email}): ${error.message}`);
  return { session: data.session, user: data.user };
}

async function callAdminOp(token, action, params = {}) {
  const resp = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const body = await resp.json();
  return { status: resp.status, body };
}

async function getAuditEntries(eventPrefix, afterTimestamp) {
  const { data } = await serviceClient
    .from('omnis_audit_trail')
    .select('event_type, entity_type, entity_name, user_email, details, source')
    .gte('created_at', afterTimestamp)
    .like('event_type', `${eventPrefix}%`)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

// ── A. Non-super-admin gate tests ───────────────────────────────────

async function testNonSuperAdminGate() {
  console.log('\n-- A. Non-super-admin without/with access row --');

  const testEmail = `gate-test-${Date.now()}@test.omnis.local`;
  let testUser;

  try {
    testUser = await createTestUser(testEmail);

    // Ensure NO access row exists
    await removeAccessRow(testUser.id);
    const { session } = await loginUser(testEmail);
    const token = session.access_token;

    // Non-super-admin without row → 403
    const r = await callAdminOp(token, 'getUsers');
    record('A1_non_super_no_row_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'no error'}`);

    // Non-super-admin with is_admin=false → 403
    await setAccess(testUser.id, false, ['salestrack']);
    const r2 = await callAdminOp(token, 'getUsers');
    record('A2_non_super_not_admin_denied', r2.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'no error'}`);

    // Non-super-admin with is_admin=true → 200
    await setAccess(testUser.id, true, ['salestrack']);
    const r3 = await callAdminOp(token, 'getUsers');
    record('A3_scoped_admin_allowed', r3.status === 200 && r3.body.ok ? 'PASS' : 'FAIL',
      `Status ${r3.status}, ok=${r3.body.ok}`);

  } catch (e) {
    record('A_non_super_admin_tests', 'FAIL', e.message);
  } finally {
    if (testUser) await deleteTestUser(testUser.id);
  }
}

// ── B. Scoped admin restrictions ────────────────────────────────────

async function testScopedAdminRestrictions() {
  console.log('\n-- B. Scoped admin restrictions --');

  const adminEmail = `scoped-admin-${Date.now()}@test.omnis.local`;
  const targetEmail = `scoped-target-${Date.now()}@test.omnis.local`;
  let adminUser, targetUser;

  try {
    adminUser = await createTestUser(adminEmail);
    targetUser = await createTestUser(targetEmail);

    await setAccess(adminUser.id, true, ['salestrack']);
    await setAccess(targetUser.id, false, ['salestrack']);

    const { session } = await loginUser(adminEmail);
    const token = session.access_token;

    // Cannot grant systems beyond own scope
    const r1 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      systems: ['salestrack', 'fleetrack'],
    });
    record('B1_scope_exceed_denied', r1.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || 'no error'}`);

    // Can grant systems within own scope
    const r2 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      systems: ['salestrack'],
    });
    record('B2_scope_within_allowed', r2.status === 200 && r2.body.ok ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'ok'}`);

    // Cannot makeAdmin (requires super-admin)
    const r3 = await callAdminOp(token, 'makeAdmin', { userId: targetUser.id });
    record('B3_scoped_cannot_promote', r3.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r3.status}: ${r3.body.error || 'no error'}`);

    // Cannot removeAdmin (requires super-admin)
    await setAccess(targetUser.id, true, ['salestrack']);
    const r4 = await callAdminOp(token, 'removeAdmin', { userId: targetUser.id });
    record('B4_scoped_cannot_demote', r4.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r4.status}: ${r4.body.error || 'no error'}`);

  } catch (e) {
    record('B_scoped_admin', 'FAIL', e.message);
  } finally {
    if (targetUser) await deleteTestUser(targetUser.id);
    if (adminUser) await deleteTestUser(adminUser.id);
  }
}

// ── C. Self-modification prevention ─────────────────────────────────

async function testSelfModification() {
  console.log('\n-- C. Self-modification prevention --');

  const email = `self-mod-${Date.now()}@test.omnis.local`;
  let user;

  try {
    user = await createTestUser(email);
    await setAccess(user.id, true, ['salestrack']);
    const { session } = await loginUser(email);
    const token = session.access_token;

    const r1 = await callAdminOp(token, 'updateUserAccess', {
      userId: user.id,
      systems: ['salestrack', 'fleetrack'],
    });
    record('C1_self_update_denied', r1.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || 'no error'}`);

    const r2 = await callAdminOp(token, 'makeAdmin', { userId: user.id });
    record('C2_self_promote_denied', r2.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'no error'}`);

  } catch (e) {
    record('C_self_mod', 'FAIL', e.message);
  } finally {
    if (user) await deleteTestUser(user.id);
  }
}

// ── D. Edit User Access flow ────────────────────────────────────────

async function testEditUserAccessFlow() {
  console.log('\n-- D. Edit User Access flow (updateUserAccess with is_admin + systems) --');

  const adminEmail = `edit-admin-${Date.now()}@test.omnis.local`;
  const targetEmail = `edit-target-${Date.now()}@test.omnis.local`;
  let adminUser, targetUser;

  try {
    adminUser = await createTestUser(adminEmail);
    targetUser = await createTestUser(targetEmail);

    await setAccess(adminUser.id, true, ['fleetrack', 'salestrack', 'powertrack', 'medicals']);
    const { session } = await loginUser(adminEmail);
    const token = session.access_token;

    // Target has NO access row — simulate "new user" via Edit User Access
    const r1 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      is_admin: false,
      systems: ['fleetrack', 'salestrack'],
    });
    record('D1_edit_access_upsert', r1.status === 200 && r1.body.ok ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || 'ok'}`);

    // Verify the row was created
    const { data: row } = await serviceClient
      .from('user_system_access')
      .select('is_admin, systems')
      .eq('user_id', targetUser.id)
      .single();

    if (row) {
      record('D2_edit_access_row_created', 'PASS',
        `is_admin=${row.is_admin}, systems=${JSON.stringify(row.systems)}`);
    } else {
      record('D2_edit_access_row_created', 'FAIL', 'No row found after upsert');
    }

    // Scoped admin trying to set is_admin=true → denied
    const r2 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      is_admin: true,
      systems: ['fleetrack'],
    });
    record('D3_edit_promote_denied', r2.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'no error'}`);

  } catch (e) {
    record('D_edit_access', 'FAIL', e.message);
  } finally {
    if (targetUser) await deleteTestUser(targetUser.id);
    if (adminUser) await deleteTestUser(adminUser.id);
  }
}

// ── E. Super-admin with NO access row ───────────────────────────────

async function testSuperAdminNoRow() {
  console.log('\n-- E. Super-admin with NO access row --');

  // Use a real super-admin email in the local disposable DB
  const superEmail = SUPER_ADMIN_EMAIL_1;
  const targetEmail = `sa-target-${Date.now()}@test.omnis.local`;
  let superUser, targetUser;

  try {
    superUser = await createTestUser(superEmail);
    targetUser = await createTestUser(targetEmail);

    // Ensure NO access row for super-admin
    await removeAccessRow(superUser.id);

    // Give target a non-admin row to operate on
    await setAccess(targetUser.id, false, ['salestrack']);

    const { session } = await loginUser(superEmail);
    const token = session.access_token;

    // E1: getUsers succeeds
    const r1 = await callAdminOp(token, 'getUsers');
    record('E1_sa_norow_getUsers', r1.status === 200 && r1.body.ok ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || `ok, ${r1.body.users?.length} users`}`);

    // E2: updateUserAccess to another user succeeds
    const r2 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      systems: ['salestrack', 'fleetrack'],
    });
    record('E2_sa_norow_updateAccess', r2.status === 200 && r2.body.ok ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'ok'}`);

    // E3: makeAdmin succeeds (super-admin can promote)
    const r3 = await callAdminOp(token, 'makeAdmin', { userId: targetUser.id });
    record('E3_sa_norow_makeAdmin', r3.status === 200 && r3.body.ok ? 'PASS' : 'FAIL',
      `Status ${r3.status}: ${r3.body.error || 'ok'}`);

    // E4: removeAdmin succeeds (target is now admin, >1 admin if super created one)
    // Ensure there are at least 2 admins before demotion
    await setAccess(superUser.id, true, []);  // give super-admin an admin row temporarily
    const r4 = await callAdminOp(token, 'removeAdmin', { userId: targetUser.id });
    record('E4_sa_norow_removeAdmin', r4.status === 200 && r4.body.ok ? 'PASS' : 'FAIL',
      `Status ${r4.status}: ${r4.body.error || 'ok'}`);

    // E5: self-modification still blocked even for super-admin
    const r5 = await callAdminOp(token, 'updateUserAccess', {
      userId: superUser.id,
      systems: ['salestrack'],
    });
    record('E5_sa_self_mod_denied', r5.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r5.status}: ${r5.body.error || 'no error'}`);

  } catch (e) {
    record('E_super_admin_norow', 'FAIL', e.message);
  } finally {
    if (targetUser) await deleteTestUser(targetUser.id);
    if (superUser) await deleteTestUser(superUser.id);
  }
}

// ── F. Super-admin with is_admin=false row ──────────────────────────

async function testSuperAdminFalseRow() {
  console.log('\n-- F. Super-admin with is_admin=false row --');

  const superEmail = SUPER_ADMIN_EMAIL_2;
  const targetEmail = `saf-target-${Date.now()}@test.omnis.local`;
  let superUser, targetUser;

  try {
    superUser = await createTestUser(superEmail);
    targetUser = await createTestUser(targetEmail);

    // Super-admin with is_admin=false
    await setAccess(superUser.id, false, ['salestrack']);
    await setAccess(targetUser.id, false, ['salestrack']);

    const { session } = await loginUser(superEmail);
    const token = session.access_token;

    // F1: getUsers succeeds (super-admin overrides is_admin=false)
    const r1 = await callAdminOp(token, 'getUsers');
    record('F1_sa_false_getUsers', r1.status === 200 && r1.body.ok ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || `ok, ${r1.body.users?.length} users`}`);

    // F2: updateUserAccess succeeds
    const r2 = await callAdminOp(token, 'updateUserAccess', {
      userId: targetUser.id,
      systems: ['fleetrack', 'salestrack'],
    });
    record('F2_sa_false_updateAccess', r2.status === 200 && r2.body.ok ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'ok'}`);

    // F3: makeAdmin succeeds
    const r3 = await callAdminOp(token, 'makeAdmin', { userId: targetUser.id });
    record('F3_sa_false_makeAdmin', r3.status === 200 && r3.body.ok ? 'PASS' : 'FAIL',
      `Status ${r3.status}: ${r3.body.error || 'ok'}`);

    // F4: removeAdmin succeeds (target is now admin)
    // Ensure at least 2 admins first
    await setAccess(superUser.id, true, []);
    const r4 = await callAdminOp(token, 'removeAdmin', { userId: targetUser.id });
    record('F4_sa_false_removeAdmin', r4.status === 200 && r4.body.ok ? 'PASS' : 'FAIL',
      `Status ${r4.status}: ${r4.body.error || 'ok'}`);

  } catch (e) {
    record('F_super_admin_false', 'FAIL', e.message);
  } finally {
    if (targetUser) await deleteTestUser(targetUser.id);
    if (superUser) await deleteTestUser(superUser.id);
  }
}

// ── G. Protected target tests ───────────────────────────────────────

async function testProtectedTargets() {
  console.log('\n-- G. Protected targets (super-admin email cannot be demoted) --');

  const callerEmail = `prot-caller-${Date.now()}@test.omnis.local`;
  const protectedEmail = SUPER_ADMIN_EMAIL_1;
  let callerUser, protectedUser;

  try {
    callerUser = await createTestUser(callerEmail);
    protectedUser = await createTestUser(protectedEmail);

    // Caller is a scoped admin. Protected target is a super-admin email.
    await setAccess(callerUser.id, true, ['salestrack', 'fleetrack', 'powertrack', 'medicals']);
    await setAccess(protectedUser.id, true, ['salestrack']);

    const { session } = await loginUser(callerEmail);
    const token = session.access_token;

    // G1: updateUserAccess on protected target — should be denied
    const r1 = await callAdminOp(token, 'updateUserAccess', {
      userId: protectedUser.id,
      systems: ['salestrack'],
    });
    // Protected targets should be blocked from modification by non-super-admins
    // The handler should check SUPER_ADMIN_EMAILS for the target
    record('G1_protected_update', r1.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r1.status}: ${r1.body.error || 'no error'}`);

    // G2: removeAdmin on protected target — should be denied
    const r2 = await callAdminOp(token, 'removeAdmin', { userId: protectedUser.id });
    record('G2_protected_demote', r2.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'no error'}`);

  } catch (e) {
    record('G_protected_targets', 'FAIL', e.message);
  } finally {
    if (protectedUser) await deleteTestUser(protectedUser.id);
    if (callerUser) await deleteTestUser(callerUser.id);
  }
}

// ── H. Last-admin protection (RPC + trigger) ────────────────────────

async function testLastAdminProtection() {
  console.log('\n-- H. Last-admin protection --');

  const admin1Email = `last-admin1-${Date.now()}@test.omnis.local`;
  const admin2Email = `last-admin2-${Date.now()}@test.omnis.local`;
  let admin1, admin2;

  try {
    // Clean ALL existing access rows using RPC that temporarily disables the trigger.
    // This is a test-only function in the disposable local DB.
    await serviceClient.rpc('test_cleanup_all_access');

    admin1 = await createTestUser(admin1Email);
    admin2 = await createTestUser(admin2Email);

    await setAccess(admin1.id, true, ['salestrack']);
    await setAccess(admin2.id, true, ['salestrack']);

    // Verify exactly 2 admins before starting
    const { data: adminCheck } = await serviceClient
      .from('user_system_access')
      .select('user_id, is_admin')
      .eq('is_admin', true);
    const adminCount = adminCheck?.length || 0;
    console.log(`    Setup: ${adminCount} admin(s) found`);
    if (adminCount !== 2) {
      record('H_setup', 'FAIL', `Expected 2 admins, found ${adminCount}`);
      return;
    }

    // H1: safe_remove_admin with 2 admins — should succeed
    const { data: result1, error: err1 } = await serviceClient.rpc('safe_remove_admin', {
      target_user_id: admin1.id,
    });

    if (err1) {
      record('H1_demote_with_remaining', 'FAIL', `RPC error: ${err1.message}`);
      record('H2_last_admin_protected', 'FAIL', 'Skipped due to H1 failure');
    } else {
      record('H1_demote_with_remaining', result1?.ok ? 'PASS' : 'FAIL',
        `ok=${result1?.ok}, reason=${result1?.reason || 'none'}`);

      // H2: Now admin2 is the only admin — should fail
      const { data: result2, error: err2 } = await serviceClient.rpc('safe_remove_admin', {
        target_user_id: admin2.id,
      });

      if (err2) {
        record('H2_last_admin_protected', 'FAIL', `RPC error: ${err2.message}`);
      } else {
        record('H2_last_admin_protected', result2?.ok === false ? 'PASS' : 'FAIL',
          `ok=${result2?.ok}, reason=${result2?.reason || 'none'}`);
      }
    }

    // H3: Trigger test — direct UPDATE to demote the last admin should fail
    // Re-establish: admin1 is now is_admin=false (from H1), admin2 is the only admin
    const { error: trigErr } = await serviceClient
      .from('user_system_access')
      .update({ is_admin: false })
      .eq('user_id', admin2.id);

    record('H3_trigger_blocks_last_demote',
      trigErr && trigErr.message.includes('last active administrator') ? 'PASS' : 'FAIL',
      trigErr ? `Trigger error: ${trigErr.message}` : 'ERROR: Update succeeded when it should have been blocked');

    // H4: Trigger test — direct DELETE of last admin should fail
    const { error: delErr } = await serviceClient
      .from('user_system_access')
      .delete()
      .eq('user_id', admin2.id);

    record('H4_trigger_blocks_last_delete',
      delErr && delErr.message.includes('last active administrator') ? 'PASS' : 'FAIL',
      delErr ? `Trigger error: ${delErr.message}` : 'ERROR: Delete succeeded when it should have been blocked');

  } catch (e) {
    record('H_last_admin', 'FAIL', e.message);
  } finally {
    // Ensure cleanup doesn't fail on last-admin protection
    // Re-promote admin1 if needed so we can safely delete
    try { await setAccess(admin1.id, true, ['salestrack']); } catch (_) {}
    if (admin1) await deleteTestUser(admin1.id);
    if (admin2) await deleteTestUser(admin2.id);
  }
}

// ── I. Audit trail verification ─────────────────────────────────────

async function testAuditEntries() {
  console.log('\n-- I. Audit trail verification --');

  const adminEmail = `audit-admin-${Date.now()}@test.omnis.local`;
  let adminUser;
  const timestamp = new Date(Date.now() - 10000).toISOString(); // 10s buffer for clock skew

  try {
    adminUser = await createTestUser(adminEmail);
    await setAccess(adminUser.id, true, ['salestrack']);
    const { session } = await loginUser(adminEmail);
    const token = session.access_token;

    // I1: Trigger a successful getUsers — should write an audit entry
    const r = await callAdminOp(token, 'getUsers');
    if (r.status !== 200) throw new Error(`getUsers failed: ${r.body.error}`);

    await new Promise(resolve => setTimeout(resolve, 500));

    const entries = await getAuditEntries('admin:', timestamp);
    const getEntry = entries.find(e =>
      e.event_type === 'admin:getUsers' && e.user_email === adminEmail
    );

    if (getEntry) {
      record('I1_audit_success_event', 'PASS',
        `event_type=${getEntry.event_type}, source=${getEntry.source}, entity_type=${getEntry.entity_type}`);

      const hasRequiredFields =
        getEntry.entity_type === 'user' &&
        getEntry.source === 'admin-operations' &&
        getEntry.details?.result === 'success';
      record('I2_audit_structure', hasRequiredFields ? 'PASS' : 'FAIL',
        `entity_type=${getEntry.entity_type}, source=${getEntry.source}, result=${getEntry.details?.result}`);
    } else {
      record('I1_audit_success_event', 'FAIL', 'No audit entry found for getUsers');
      record('I2_audit_structure', 'FAIL', 'No entry to check');
    }

    // I3: Trigger a denied action — non-super-admin trying makeAdmin
    const targetEmail2 = `audit-target-${Date.now()}@test.omnis.local`;
    let targetUser2;
    try {
      targetUser2 = await createTestUser(targetEmail2);
      await setAccess(targetUser2.id, false, ['salestrack']);
      await callAdminOp(token, 'makeAdmin', { userId: targetUser2.id });

      await new Promise(resolve => setTimeout(resolve, 500));
      const denied = await getAuditEntries('admin:makeAdmin', timestamp);
      const deniedEntry = denied.find(e =>
        e.user_email === adminEmail && e.details?.result === 'denied'
      );
      record('I3_audit_denied_event', deniedEntry ? 'PASS' : 'FAIL',
        deniedEntry
          ? `result=${deniedEntry.details.result}, detail=${deniedEntry.details.detail}`
          : 'No denied audit entry found');
    } finally {
      if (targetUser2) await deleteTestUser(targetUser2.id);
    }

    // I4: Audit identity check — for getUsers and makeAdmin events from this
    // test, the user_email field must match the authenticated caller.
    // Scoped to only this test's admin email (ignore events from other suites).
    const myEntries = await getAuditEntries('admin:', timestamp);
    const callerEntries = myEntries.filter(e => e.user_email === adminEmail);
    const wrongCaller = callerEntries.filter(e =>
      e.user_email !== adminEmail
    );
    record('I4_audit_caller_identity',
      callerEntries.length >= 2 && wrongCaller.length === 0 ? 'PASS' : 'FAIL',
      `${callerEntries.length} entries for caller, ${wrongCaller.length} with wrong identity`);

  } catch (e) {
    record('I_audit_tests', 'FAIL', e.message);
  } finally {
    if (adminUser) await deleteTestUser(adminUser.id);
  }
}

// ── Runner ──────────────────────────────────────────────────────────

async function runTests() {
  console.log('=== Super-Admin Gate Regression Tests ===');
  console.log('Started:', new Date().toISOString());
  console.log('Target:', SUPABASE_URL);
  console.log('JWT issuer: supabase-demo (disposable local)');
  console.log('');

  await testNonSuperAdminGate();
  await testScopedAdminRestrictions();
  await testSelfModification();
  await testEditUserAccessFlow();
  await testSuperAdminNoRow();
  await testSuperAdminFalseRow();
  await testProtectedTargets();
  await testLastAdminProtection();
  await testAuditEntries();

  console.log('\n=== RESULTS ===');
  let passed = 0, failed = 0, skipped = 0;
  RESULTS.forEach(r => {
    if (r.status === 'PASS') passed++;
    else if (r.status === 'FAIL') failed++;
    else skipped++;
  });
  console.log(`Total: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
  }
  if (skipped > 0) {
    console.log('\nSKIPPED:');
    RESULTS.filter(r => r.status === 'SKIP').forEach(r => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
  }
  return { passed, failed, results: RESULTS };
}

if (require.main === module) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0)).catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
  });
}

module.exports = { runTests };
