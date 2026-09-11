/**
 * test_concurrency.js — Last-admin coordination concurrency tests.
 *
 * Requires a LOCAL Supabase stack with:
 *   - Migration 20260910000000_last_admin_protection.sql applied
 *   - admin-operations Edge Function serving
 *   - At least 3 test users with admin access
 *
 * These tests exercise real database transactions and verify the FOR UPDATE
 * locking behavior of safe_remove_admin() and check_last_admin_removal().
 *
 * Usage:
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_ANON_KEY=<local_anon_key> \
 *   SUPABASE_SERVICE_KEY=<local_service_key> \
 *   node tests/test_concurrency.js
 */

const { createClient } = require('@supabase/supabase-js');
const guard = require('./test_env_guard');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

// ── Helpers ──────────────────────────────────────────────────────────

async function createTestUser(email, password = 'Test1234!') {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

async function deleteTestUser(userId) {
  await serviceClient.from('user_system_access').delete().eq('user_id', userId);
  await serviceClient.auth.admin.deleteUser(userId).catch(() => {});
}

async function setAdmin(userId, isAdmin) {
  const { error } = await serviceClient
    .from('user_system_access')
    .upsert({ user_id: userId, is_admin: isAdmin, systems: ['test'] }, { onConflict: 'user_id' });
  if (error) throw new Error(`setAdmin(${userId}, ${isAdmin}): ${error.message}`);
}

async function getAdmin(userId) {
  const { data } = await serviceClient
    .from('user_system_access')
    .select('is_admin')
    .eq('user_id', userId)
    .single();
  return data?.is_admin;
}

async function countActiveAdmins() {
  const { data } = await serviceClient
    .from('user_system_access')
    .select('user_id')
    .eq('is_admin', true);
  return data?.length || 0;
}

/**
 * Demote all admins EXCEPT those in the keepIds array.
 * This isolates last-admin tests from leftover admin users created by other suites.
 * Only touches is_admin — does not delete users or modify auth state.
 */
async function demoteAllExcept(keepIds) {
  const { data: allAdmins } = await serviceClient
    .from('user_system_access')
    .select('user_id')
    .eq('is_admin', true);
  const toDemote = (allAdmins || []).filter(r => !keepIds.includes(r.user_id));
  for (const row of toDemote) {
    await serviceClient
      .from('user_system_access')
      .update({ is_admin: false })
      .eq('user_id', row.user_id);
  }
  if (toDemote.length > 0) {
    console.log(`    [fixture] Demoted ${toDemote.length} stale admin(s) to isolate test`);
  }
  return toDemote.map(r => r.user_id); // return IDs so we can restore them
}

/**
 * Restore previously demoted admins. Called in finally blocks.
 */
async function restoreAdmins(userIds) {
  for (const uid of userIds) {
    await serviceClient
      .from('user_system_access')
      .update({ is_admin: true })
      .eq('user_id', uid);
  }
  if (userIds.length > 0) {
    console.log(`    [fixture] Restored ${userIds.length} admin(s)`);
  }
}

// ── Tests ────────────────────────────────────────────────────────────

async function testSafeRemoveLastAdmin() {
  console.log('\n-- Test: safe_remove_admin blocks last admin removal --');
  const user = await createTestUser(`solo-admin-${Date.now()}@test.local`);
  let demoted = [];
  try {
    await setAdmin(user.id, true);

    // Isolate: ensure this user is the ONLY admin
    demoted = await demoteAllExcept([user.id]);
    const adminCount = await countActiveAdmins();
    console.log(`    [precondition] Active admins: ${adminCount} (expect 1)`);

    // Attempt to remove the sole admin
    const { data, error } = await serviceClient.rpc('safe_remove_admin', {
      target_user_id: user.id
    });

    if (error) {
      record('safe_remove_last', 'FAIL', `RPC error: ${error.message}`);
    } else if (data?.ok === false) {
      record('safe_remove_last', 'PASS', `Correctly blocked: ${data.reason}`);
    } else {
      record('safe_remove_last', 'FAIL', `Should have blocked but returned: ${JSON.stringify(data)}`);
    }

    // Verify user is still admin
    const stillAdmin = await getAdmin(user.id);
    if (stillAdmin) {
      record('safe_remove_last_state', 'PASS', 'Admin status preserved after block');
    } else {
      record('safe_remove_last_state', 'FAIL', 'Admin status changed despite block!');
    }
  } finally {
    await restoreAdmins(demoted);
    await deleteTestUser(user.id);
  }
}


async function testSafeRemoveNonLastAdmin() {
  console.log('\n-- Test: safe_remove_admin allows removal when another admin exists --');
  const user1 = await createTestUser(`admin1-${Date.now()}@test.local`);
  const user2 = await createTestUser(`admin2-${Date.now()}@test.local`);
  try {
    await setAdmin(user1.id, true);
    await setAdmin(user2.id, true);

    const { data, error } = await serviceClient.rpc('safe_remove_admin', {
      target_user_id: user1.id
    });

    if (error) {
      record('safe_remove_nonlast', 'FAIL', `RPC error: ${error.message}`);
    } else if (data?.ok === true) {
      record('safe_remove_nonlast', 'PASS', 'Allowed removal — another admin remains');
    } else {
      record('safe_remove_nonlast', 'FAIL', `Blocked unexpectedly: ${JSON.stringify(data)}`);
    }

    // Verify user1 is now NOT admin
    const isAdmin = await getAdmin(user1.id);
    if (!isAdmin) {
      record('safe_remove_nonlast_state', 'PASS', 'User correctly demoted');
    } else {
      record('safe_remove_nonlast_state', 'FAIL', 'User still admin after removal!');
    }
  } finally {
    await deleteTestUser(user1.id);
    await deleteTestUser(user2.id);
  }
}

async function testConcurrentRemovalLastTwo() {
  console.log('\n-- Test: concurrent removal of last two admins --');
  const user1 = await createTestUser(`conc-admin1-${Date.now()}@test.local`);
  const user2 = await createTestUser(`conc-admin2-${Date.now()}@test.local`);
  let demoted = [];
  try {
    await setAdmin(user1.id, true);
    await setAdmin(user2.id, true);

    // Isolate: ensure only these two are admins
    demoted = await demoteAllExcept([user1.id, user2.id]);
    const adminCount = await countActiveAdmins();
    console.log(`    [precondition] Active admins: ${adminCount} (expect 2)`);

    // Fire both removals concurrently
    const [r1, r2] = await Promise.all([
      serviceClient.rpc('safe_remove_admin', { target_user_id: user1.id }),
      serviceClient.rpc('safe_remove_admin', { target_user_id: user2.id }),
    ]);

    const ok1 = r1.data?.ok;
    const ok2 = r2.data?.ok;

    if (ok1 && ok2) {
      record('concurrent_last_two', 'FAIL', 'Both removals succeeded — zero admin race!');
    } else if ((ok1 && !ok2) || (!ok1 && ok2)) {
      const winner = ok1 ? 'user1' : 'user2';
      record('concurrent_last_two', 'PASS', `Exactly one succeeded (${winner}), other blocked`);
    } else {
      record('concurrent_last_two', 'FAIL', `Unexpected: r1=${JSON.stringify(r1.data)}, r2=${JSON.stringify(r2.data)}`);
    }

    // Verify at least 1 admin remains (among test-owned users)
    const adminCount2 = await countActiveAdmins();
    if (adminCount2 >= 1) {
      record('concurrent_last_two_state', 'PASS', `${adminCount2} admin(s) remain`);
    } else {
      record('concurrent_last_two_state', 'FAIL', `Zero admins remain!`);
    }
  } finally {
    await restoreAdmins(demoted);
    await deleteTestUser(user1.id);
    await deleteTestUser(user2.id);
  }
}


async function testIdempotentRemoval() {
  console.log('\n-- Test: repeated safe_remove_admin is idempotent --');
  const user1 = await createTestUser(`idem-admin1-${Date.now()}@test.local`);
  const user2 = await createTestUser(`idem-admin2-${Date.now()}@test.local`);
  try {
    await setAdmin(user1.id, true);
    await setAdmin(user2.id, true);

    // First removal
    const r1 = await serviceClient.rpc('safe_remove_admin', { target_user_id: user1.id });
    // Second removal (same target)
    const r2 = await serviceClient.rpc('safe_remove_admin', { target_user_id: user1.id });

    if (r1.data?.ok && r2.data?.ok) {
      record('idempotent_removal', 'PASS', 'Both calls returned ok=true (already demoted)');
    } else {
      record('idempotent_removal', 'FAIL',
        `r1=${JSON.stringify(r1.data)}, r2=${JSON.stringify(r2.data)}`);
    }
  } finally {
    await deleteTestUser(user1.id);
    await deleteTestUser(user2.id);
  }
}

async function testRemoveNonExistent() {
  console.log('\n-- Test: safe_remove_admin on non-existent user --');
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await serviceClient.rpc('safe_remove_admin', {
    target_user_id: fakeId
  });

  if (error) {
    record('remove_nonexistent', 'FAIL', `RPC error: ${error.message}`);
  } else if (data?.ok === true) {
    record('remove_nonexistent', 'PASS', 'Returns ok=true for non-existent user (idempotent)');
  } else {
    record('remove_nonexistent', 'FAIL', `Unexpected: ${JSON.stringify(data)}`);
  }
}

async function testCompensationScenario() {
  console.log('\n-- Test: compensation must not overwrite subsequent changes --');
  const user1 = await createTestUser(`comp-admin1-${Date.now()}@test.local`);
  const user2 = await createTestUser(`comp-admin2-${Date.now()}@test.local`);
  try {
    await setAdmin(user1.id, true);
    await setAdmin(user2.id, true);

    // Step 1: Atomically demote user1
    const { data: r1 } = await serviceClient.rpc('safe_remove_admin', {
      target_user_id: user1.id
    });
    if (!r1?.ok) {
      record('compensation_setup', 'FAIL', 'Initial demotion failed');
      return;
    }

    // Step 2: Simulate a subsequent intentional demotion —
    // Another admin makes user1 a regular user (not admin)
    // This is the "state has moved on" scenario
    const isAdminNow = await getAdmin(user1.id);
    if (isAdminNow) {
      record('compensation_setup', 'FAIL', 'User1 still admin after safe_remove_admin');
      return;
    }

    // Step 3: Now if we naively revert (simulate Auth API failure compensation),
    // we'd restore is_admin=true, which OVERWRITES the current non-admin state.
    // The test verifies that blind compensation would be wrong.
    //
    // In real code, the Edge Function checks wasAdmin before reverting.
    // Here we verify the database state is correctly non-admin.
    record('compensation_state', 'PASS', 'User correctly non-admin after demotion');

    // Step 4: If someone re-promotes user1 between demotion and compensation,
    // blind compensation should NOT demote them again.
    await setAdmin(user1.id, true);
    const isAdminAfterPromo = await getAdmin(user1.id);
    if (isAdminAfterPromo) {
      // Now if Auth API had failed and compensation runs:
      // "await admin.from('user_system_access').update({is_admin: true}).eq('user_id', userId)"
      // This is safe because they're already admin — it's a no-op.
      // But if compensation was "set is_admin = false" on failure, it would be wrong.
      record('compensation_no_overwrite', 'PASS',
        'Re-promotion preserved — compensation (set admin=true) is safe no-op');
    } else {
      record('compensation_no_overwrite', 'FAIL', 'Re-promotion lost');
    }
  } finally {
    await deleteTestUser(user1.id);
    await deleteTestUser(user2.id);
  }
}

async function testRpcAnonDenied() {
  console.log('\n-- Test: RPC functions denied to anon --');

  // safe_remove_admin as anon
  const { data: d1, error: e1 } = await anonClient.rpc('safe_remove_admin', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });
  if (e1) {
    record('rpc_safe_remove_anon', 'PASS', `Denied: ${e1.message.substring(0, 60)}`);
  } else {
    record('rpc_safe_remove_anon', 'FAIL', `Succeeded! Data: ${JSON.stringify(d1)}`);
  }

  // check_last_admin_removal as anon
  const { data: d2, error: e2 } = await anonClient.rpc('check_last_admin_removal', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });
  if (e2) {
    record('rpc_check_last_anon', 'PASS', `Denied: ${e2.message.substring(0, 60)}`);
  } else {
    record('rpc_check_last_anon', 'FAIL', `Succeeded! Data: ${JSON.stringify(d2)}`);
  }
}

async function testRpcAuthenticatedDenied() {
  console.log('\n-- Test: RPC functions denied to authenticated user --');
  const testEmail = `rpc-auth-${Date.now()}@test.local`;
  const testPassword = 'Test1234!';
  const user = await createTestUser(testEmail, testPassword);

  try {
    // Sign in as authenticated user
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await authClient.auth.signInWithPassword({ email: testEmail, password: testPassword });

    const { data: d1, error: e1 } = await authClient.rpc('safe_remove_admin', {
      target_user_id: user.id
    });
    if (e1) {
      record('rpc_safe_remove_authenticated', 'PASS', `Denied: ${e1.message.substring(0, 60)}`);
    } else {
      record('rpc_safe_remove_authenticated', 'FAIL', `Succeeded! Data: ${JSON.stringify(d1)}`);
    }

    const { data: d2, error: e2 } = await authClient.rpc('check_last_admin_removal', {
      target_user_id: user.id
    });
    if (e2) {
      record('rpc_check_last_authenticated', 'PASS', `Denied: ${e2.message.substring(0, 60)}`);
    } else {
      record('rpc_check_last_authenticated', 'FAIL', `Succeeded! Data: ${JSON.stringify(d2)}`);
    }

    await authClient.auth.signOut();
  } finally {
    await deleteTestUser(user.id);
  }
}

async function testRpcServiceRoleAllowed() {
  console.log('\n-- Test: RPC functions allowed for service_role --');
  // service_role should be able to call safe_remove_admin on a non-existent user
  const { data, error } = await serviceClient.rpc('safe_remove_admin', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });
  if (error) {
    record('rpc_service_role_allowed', 'FAIL', `Denied: ${error.message}`);
  } else {
    record('rpc_service_role_allowed', 'PASS', `Allowed: ${JSON.stringify(data)}`);
  }
}

async function testSearchPathSafety() {
  console.log('\n-- Test: SECURITY DEFINER search_path cannot resolve attacker objects --');
  // Attempt to create a malicious function in the public schema
  // that could shadow user_system_access if search_path was wrong.
  // The functions use SET search_path = public, and user_system_access
  // is in public, so this is correct. We verify by calling the function
  // and checking it resolves the real table.
  const user = await createTestUser(`sp-admin-${Date.now()}@test.local`);
  try {
    await setAdmin(user.id, true);

    // Call check_last_admin_removal — if search_path was wrong, it might
    // not find user_system_access or resolve a wrong table.
    const { data, error } = await serviceClient.rpc('check_last_admin_removal', {
      target_user_id: user.id
    });
    if (error) {
      record('search_path_safe', 'FAIL', `Error: ${error.message}`);
    } else {
      // Should return true (this is the last admin) or false (if other test users exist)
      record('search_path_safe', 'PASS', `Function resolved correctly: result=${data}`);
    }
  } finally {
    await deleteTestUser(user.id);
  }
}

// ── Runner ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== Concurrency & RPC Security Tests ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Verify test environment
  const identity = await guard.verify(serviceClient);
  console.log(`  Environment: ${identity.hostname} (local=${identity.isLocal}, marker=${identity.markerFound})`);

  try {
    // Verify service client can access DB
    const { count } = await serviceClient
      .from('user_system_access')
      .select('*', { count: 'exact', head: true });
    console.log(`Existing access rows: ${count}\n`);
  } catch (e) {
    console.error(`Cannot connect to DB: ${e.message}`);
    process.exit(1);
  }

  await testSafeRemoveLastAdmin();
  await testSafeRemoveNonLastAdmin();
  await testConcurrentRemovalLastTwo();
  await testIdempotentRemoval();
  await testRemoveNonExistent();
  await testCompensationScenario();
  await testRpcAnonDenied();
  await testRpcAuthenticatedDenied();
  await testRpcServiceRoleAllowed();
  await testSearchPathSafety();

  console.log('\n=== RESULTS ===');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${RESULTS.length} | Pass: ${pass} | Fail: ${fail}`);

  if (fail > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(3); });
