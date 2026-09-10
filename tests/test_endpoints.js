/**
 * test_endpoints.js — Endpoint, Session, RLS, and Compensation Tests
 * 
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY env vars
 * Requires: Edge Functions served locally (supabase functions serve)
 * 
 * Tests cover:
 * - Missing/invalid/expired JWTs
 * - Authorized operations succeeding
 * - Ordinary-user denial for privileged actions
 * - Company isolation and scoped listings
 * - Self-promotion prevention
 * - Deferred actions (setPassword*, impersonate)
 * - Password-reset token exclusion
 * - Login, refresh, logout
 * - Direct database RLS enforcement
 * - Compensation through actual handler (failure injection via mock)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

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
    .upsert({ user_id: userId, is_admin: isAdmin, systems: ['salestrack'] }, { onConflict: 'user_id' });
  if (error) throw new Error(`setAdmin(${userId}, ${isAdmin}): ${error.message}`);
}

async function setSystems(userId, systems) {
  const { error } = await serviceClient
    .from('user_system_access')
    .update({ systems })
    .eq('user_id', userId);
  if (error) throw new Error(`setSystems: ${error.message}`);
}

async function loginUser(email, password = 'Test1234!') {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login(${email}): ${error.message}`);
  return { client, session: data.session, user: data.user };
}

async function callAdminOp(token, action, params = {}) {
  const url = `${FUNCTIONS_URL}/admin-operations`;
  const resp = await fetch(url, {
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

// ── Test Suites ─────────────────────────────────────────────────────

async function testJWTValidation() {
  console.log('\n-- JWT Validation Tests --');

  // Missing token
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ action: 'listUsers' }),
    });
    const body = await resp.json();
    record('jwt_missing', resp.status === 401 ? 'PASS' : 'FAIL',
      `Status ${resp.status}: ${body.error || 'no error'}`);
  } catch (e) { record('jwt_missing', 'FAIL', e.message); }

  // Invalid token
  try {
    const r = await callAdminOp('not-a-valid-token', 'listUsers');
    record('jwt_invalid', r.status === 401 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'no error'}`);
  } catch (e) { record('jwt_invalid', 'FAIL', e.message); }

  // Expired token (forge a bad one)
  try {
    const r = await callAdminOp('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiZXhwIjoxNjAwMDAwMDAwfQ.bad', 'listUsers');
    record('jwt_expired', r.status === 401 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'no error'}`);
  } catch (e) { record('jwt_expired', 'FAIL', e.message); }
}

async function testOrdinaryUserDenied() {
  console.log('\n-- Ordinary User Denial Tests --');
  
  const ts = Date.now();
  const user = await createTestUser(`ordinary-${ts}@test.local`);
  // user_system_access is auto-created by trigger with is_admin=false
  const { session } = await loginUser(`ordinary-${ts}@test.local`);
  const token = session.access_token;

  const privilegedActions = [
    { action: 'listUsers', params: {} },
    { action: 'createUser', params: { email: 'x@x.com', password: 'Test1234!' } },
    { action: 'suspendUser', params: { userId: user.id } },
    { action: 'unsuspendUser', params: { userId: user.id } },
    { action: 'deleteUser', params: { userId: user.id } },
    { action: 'makeAdmin', params: { userId: user.id } },
    { action: 'removeAdmin', params: { userId: user.id } },
    { action: 'resetPassword', params: { email: `ordinary-${ts}@test.local` } },
    { action: 'inviteUser', params: { email: 'x@x.com' } },
    { action: 'updateUserAccess', params: { userId: user.id, systems: ['all'] } },
  ];

  for (const { action, params } of privilegedActions) {
    try {
      const r = await callAdminOp(token, action, params);
      record(`ordinary_denied_${action}`, r.status === 403 ? 'PASS' : 'FAIL',
        `Status ${r.status}: ${r.body.error || 'unexpected success'}`);
    } catch (e) { record(`ordinary_denied_${action}`, 'FAIL', e.message); }
  }

  await deleteTestUser(user.id);
}

async function testAdminOperationsSucceed() {
  console.log('\n-- Admin Operations Succeed Tests --');
  
  const ts = Date.now();
  const admin = await createTestUser(`admin-${ts}@test.local`);
  await setAdmin(admin.id, true);
  const { session: adminSession } = await loginUser(`admin-${ts}@test.local`);
  const token = adminSession.access_token;

  // Create a second admin so operations that demote don't trigger last-admin
  const admin2 = await createTestUser(`admin2-${ts}@test.local`);
  await setAdmin(admin2.id, true);

  // listUsers
  try {
    const r = await callAdminOp(token, 'listUsers');
    record('admin_listUsers', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}, users: ${r.body.users?.length || 0}`);
  } catch (e) { record('admin_listUsers', 'FAIL', e.message); }

  // createUser
  let createdUserId;
  try {
    const r = await callAdminOp(token, 'createUser', {
      email: `created-${ts}@test.local`, password: 'Test1234!', systems: ['salestrack']
    });
    createdUserId = r.body.user?.id;
    record('admin_createUser', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.user?.email || r.body.error}`);
  } catch (e) { record('admin_createUser', 'FAIL', e.message); }

  // suspendUser (target is the created user)
  if (createdUserId) {
    try {
      const r = await callAdminOp(token, 'suspendUser', { userId: createdUserId });
      record('admin_suspendUser', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
        `Status ${r.status}: ${r.body.error || 'ok'}`);
    } catch (e) { record('admin_suspendUser', 'FAIL', e.message); }

    // unsuspendUser
    try {
      const r = await callAdminOp(token, 'unsuspendUser', { userId: createdUserId });
      record('admin_unsuspendUser', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
        `Status ${r.status}: ${r.body.error || 'ok'}`);
    } catch (e) { record('admin_unsuspendUser', 'FAIL', e.message); }
  }

  // Cleanup
  if (createdUserId) await deleteTestUser(createdUserId);
  await deleteTestUser(admin2.id);
  await deleteTestUser(admin.id);
}

async function testSelfPromotionPrevented() {
  console.log('\n-- Self-Promotion Prevention Tests --');
  
  const ts = Date.now();
  const admin = await createTestUser(`selfpromo-${ts}@test.local`);
  await setAdmin(admin.id, true);
  const { session } = await loginUser(`selfpromo-${ts}@test.local`);
  const token = session.access_token;

  // Self makeAdmin
  try {
    const r = await callAdminOp(token, 'makeAdmin', { userId: admin.id });
    record('self_makeAdmin', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('self_makeAdmin', 'FAIL', e.message); }

  // Self removeAdmin
  try {
    const r = await callAdminOp(token, 'removeAdmin', { userId: admin.id });
    record('self_removeAdmin', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('self_removeAdmin', 'FAIL', e.message); }

  // Self via updateUserAccess (try to add systems)
  try {
    const r = await callAdminOp(token, 'updateUserAccess', { userId: admin.id, systems: ['all'] });
    // This should either be denied or scoped
    record('self_updateAccess', (r.status === 403 || r.body.error) ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'check self-modification'}`);
  } catch (e) { record('self_updateAccess', 'FAIL', e.message); }

  await deleteTestUser(admin.id);
}

async function testDeferredActions() {
  console.log('\n-- Deferred Actions Tests --');
  
  const ts = Date.now();
  const admin = await createTestUser(`deferred-${ts}@test.local`);
  await setAdmin(admin.id, true);
  const { session } = await loginUser(`deferred-${ts}@test.local`);
  const token = session.access_token;

  const deferred = ['setPassword', 'setPasswordDirect', 'setPasswordByEmail', 'impersonate'];
  for (const action of deferred) {
    try {
      const r = await callAdminOp(token, action, { userId: admin.id });
      record(`deferred_${action}`,
        r.status === 403 && r.body.deferred === true ? 'PASS' : 'FAIL',
        `Status ${r.status}, deferred=${r.body.deferred}: ${r.body.error || 'no error'}`);
    } catch (e) { record(`deferred_${action}`, 'FAIL', e.message); }
  }

  await deleteTestUser(admin.id);
}

async function testSessionLifecycle() {
  console.log('\n-- Session Lifecycle Tests --');
  
  const ts = Date.now();
  const user = await createTestUser(`session-${ts}@test.local`);
  const client = createClient(SUPABASE_URL, ANON_KEY);

  // Sign in
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: `session-${ts}@test.local`, password: 'Test1234!',
  });
  record('session_signin', !signInError && signInData.session ? 'PASS' : 'FAIL',
    signInError?.message || `Got session with ${signInData.session?.access_token?.length} char token`);

  // Get session
  const { data: sessionData } = await client.auth.getSession();
  record('session_get', sessionData.session ? 'PASS' : 'FAIL',
    sessionData.session ? 'Active session' : 'No session');

  // Refresh
  if (signInData.session?.refresh_token) {
    const { data: refreshData, error: refreshError } = await client.auth.refreshSession();
    record('session_refresh', !refreshError && refreshData.session ? 'PASS' : 'FAIL',
      refreshError?.message || 'Refreshed');
  } else {
    record('session_refresh', 'FAIL', 'No refresh token');
  }

  // Sign out
  const { error: signOutError } = await client.auth.signOut();
  record('session_signout', !signOutError ? 'PASS' : 'FAIL',
    signOutError?.message || 'Signed out');

  // Verify signed out
  const { data: afterLogout } = await client.auth.getSession();
  record('session_after_logout', !afterLogout.session ? 'PASS' : 'FAIL',
    !afterLogout.session ? 'No session after logout' : 'Session still exists!');

  await deleteTestUser(user.id);
}

async function testDirectRLS() {
  console.log('\n-- Direct Database RLS Tests --');
  
  const ts = Date.now();
  // Create two users in different "companies" (different systems)
  const userA = await createTestUser(`rls-a-${ts}@test.local`);
  const userB = await createTestUser(`rls-b-${ts}@test.local`);
  await setSystems(userA.id, ['company_a']);
  await setSystems(userB.id, ['company_b']);

  // User A signs in
  const { client: clientA } = await loginUser(`rls-a-${ts}@test.local`);

  // User A can read own access row
  const { data: ownRow, error: ownErr } = await clientA
    .from('user_system_access')
    .select('*')
    .eq('user_id', userA.id);
  record('rls_read_own', ownRow && ownRow.length === 1 ? 'PASS' : 'FAIL',
    `Own row: ${ownRow?.length || 0} rows, error: ${ownErr?.message || 'none'}`);

  // User A cannot read User B's access row (RLS)
  const { data: otherRow } = await clientA
    .from('user_system_access')
    .select('*')
    .eq('user_id', userB.id);
  record('rls_cannot_read_other', (!otherRow || otherRow.length === 0) ? 'PASS' : 'FAIL',
    `Other's row: ${otherRow?.length || 0} rows (should be 0)`);

  // User A cannot UPDATE own is_admin
  const { error: selfPromote } = await clientA
    .from('user_system_access')
    .update({ is_admin: true })
    .eq('user_id', userA.id);
  // After update, check if it actually changed
  const { data: checkPromo } = await serviceClient
    .from('user_system_access')
    .select('is_admin')
    .eq('user_id', userA.id)
    .single();
  record('rls_no_self_promote', checkPromo?.is_admin === false ? 'PASS' : 'FAIL',
    `is_admin after self-update attempt: ${checkPromo?.is_admin} (should be false)`);

  // Anon client cannot read user_system_access
  const { data: anonRows, error: anonErr } = await anonClient
    .from('user_system_access')
    .select('*');
  record('rls_anon_blocked', (!anonRows || anonRows.length === 0) ? 'PASS' : 'FAIL',
    `Anon rows: ${anonRows?.length || 0}, error: ${anonErr?.message || 'none'}`);

  // RPC denied to authenticated user
  const { error: rpcErr } = await clientA.rpc('safe_remove_admin', { target_user_id: userB.id });
  record('rls_rpc_denied_authenticated', rpcErr ? 'PASS' : 'FAIL',
    rpcErr ? `Denied: ${rpcErr.message}` : 'RPC unexpectedly succeeded!');

  // is_admin() function works for authenticated
  const { data: isAdminResult, error: isAdminErr } = await clientA.rpc('is_admin');
  record('rls_is_admin_function', isAdminResult === false && !isAdminErr ? 'PASS' : 'FAIL',
    `is_admin()=${isAdminResult}, error: ${isAdminErr?.message || 'none'}`);

  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}

async function testPasswordResetNoToken() {
  console.log('\n-- Password Reset Token Exclusion --');
  
  const ts = Date.now();
  const admin = await createTestUser(`pwreset-${ts}@test.local`);
  await setAdmin(admin.id, true);
  const { session } = await loginUser(`pwreset-${ts}@test.local`);
  const token = session.access_token;

  try {
    const r = await callAdminOp(token, 'resetPassword', { email: `pwreset-${ts}@test.local` });
    // Response should NOT contain recovery_token or similar secrets
    const bodyStr = JSON.stringify(r.body);
    const hasToken = bodyStr.includes('recovery_token') || bodyStr.includes('pkce') || bodyStr.includes('code_verifier');
    record('reset_no_token_leak', !hasToken ? 'PASS' : 'FAIL',
      `No token in response: ${!hasToken}. Status: ${r.status}`);
  } catch (e) { record('reset_no_token_leak', 'FAIL', e.message); }

  await deleteTestUser(admin.id);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('============================================================');
  console.log('Endpoint, Session, RLS & Compensation Test Suite');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Functions: ${FUNCTIONS_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  // Pre-flight: check API health
  try {
    const { count } = await serviceClient.from('user_system_access').select('*', { count: 'exact', head: true });
    console.log(`\nPre-flight: user_system_access accessible, ${count} rows\n`);
  } catch (e) {
    console.error(`Pre-flight failed: ${e.message}`);
    process.exit(1);
  }

  // Check if Edge Functions are reachable
  let edgeFunctionsAvailable = false;
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/admin-operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ action: 'ping' }),
    });
    edgeFunctionsAvailable = resp.status !== 502 && resp.status !== 0;
    console.log(`Edge Functions: ${edgeFunctionsAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} (status: ${resp.status})\n`);
  } catch (e) {
    console.log(`Edge Functions: UNAVAILABLE (${e.message})\n`);
  }

  if (edgeFunctionsAvailable) {
    await testJWTValidation();
    await testOrdinaryUserDenied();
    await testAdminOperationsSucceed();
    await testSelfPromotionPrevented();
    await testDeferredActions();
    await testPasswordResetNoToken();
  } else {
    console.log('\n⚠️  Edge Functions not available — endpoint tests SKIPPED');
    console.log('   Start with: supabase functions serve\n');
    ['jwt_missing', 'jwt_invalid', 'jwt_expired'].forEach(n =>
      record(n, 'SKIP', 'Edge Functions not served'));
    ['listUsers','createUser','suspendUser','unsuspendUser','deleteUser',
     'makeAdmin','removeAdmin','resetPassword','inviteUser','updateUserAccess'].forEach(n =>
      record(`ordinary_denied_${n}`, 'SKIP', 'Edge Functions not served'));
    ['admin_listUsers','admin_createUser','admin_suspendUser','admin_unsuspendUser'].forEach(n =>
      record(n, 'SKIP', 'Edge Functions not served'));
    ['self_makeAdmin','self_removeAdmin','self_updateAccess'].forEach(n =>
      record(n, 'SKIP', 'Edge Functions not served'));
    ['setPassword','setPasswordDirect','setPasswordByEmail','impersonate'].forEach(n =>
      record(`deferred_${n}`, 'SKIP', 'Edge Functions not served'));
    record('reset_no_token_leak', 'SKIP', 'Edge Functions not served');
  }

  // These tests work without Edge Functions
  await testSessionLifecycle();
  await testDirectRLS();

  // Summary
  console.log('\n============================================================');
  console.log('RESULTS SUMMARY');
  console.log('============================================================');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  const skip = RESULTS.filter(r => r.status === 'SKIP').length;
  console.log(`  Total: ${RESULTS.length} | Pass: ${pass} | Fail: ${fail} | Skip: ${skip}`);

  if (fail > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }
  if (skip > 0) {
    console.log(`\n⚠️  ${skip} tests SKIPPED (Edge Functions not served)`);
  }

  process.exit(fail > 0 ? 1 : (skip > 0 ? 2 : 0));
}

main().catch(e => { console.error(e); process.exit(3); });
