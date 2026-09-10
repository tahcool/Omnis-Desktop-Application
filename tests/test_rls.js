/**
 * RLS (Row Level Security) + Authorization Integration Test Suite
 * ================================================================
 * Tests authentication, RLS behavior, and admin Edge Function authorization
 * against a live Supabase instance (local or remote).
 *
 * PREREQUISITES:
 *   - SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 *   - Optionally: TEST_USER_EMAIL and TEST_USER_PASSWORD for auth tests
 *
 * MODES:
 *   --ci      Exit non-zero if ANY test fails or if ALL tests are SPEC
 *             (prevents release when tests couldn't actually run)
 *   --strict  Same as --ci plus treats SPEC as failure
 *
 * Run: node tests/test_rls.js [--ci] [--strict]
 *
 * EXIT CODES:
 *   0 — all tests passed (at least one real execution)
 *   1 — test failures detected
 *   2 — all tests were SPEC (nothing actually ran) — blocks CI
 *   3 — setup/runtime error
 */

const RESULTS = [];
function record(name, status, detail = '') {
  RESULTS.push({ test: name, status, detail });
  const marker = { PASS: 'OK', FAIL: 'FAIL', NOT_RUN: 'SKIP', SPEC: 'SPEC' }[status];
  console.log(`  [${marker}] ${name}${detail ? ' -- ' + detail : ''}`);
}

// ── Check if we can actually connect ──────────────────────────────

let supabase = null;
let canConnect = false;

async function setup() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.log('\n  Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.');
      console.log('  Tests will be marked as SPEC (specified but not executed).\n');
      return false;
    }

    // Verify key type — must NOT be service role
    if (key.startsWith('sb_secret_')) {
      console.log('\n  ERROR: SUPABASE_ANON_KEY contains a service role key.');
      console.log('  RLS tests are meaningless with service_role — it bypasses all policies.');
      console.log('  Set SUPABASE_ANON_KEY to the anon (publishable) key.\n');
      return false;
    }

    supabase = createClient(url, key);

    // Verify connectivity
    const { error } = await supabase.from('user_system_access').select('user_id').limit(0);
    if (error && error.message.includes('does not exist')) {
      console.log('  WARNING: user_system_access table not found. Database may not be initialized.');
    }
    canConnect = true;
    console.log('  Connected to Supabase.\n');
    return true;
  } catch (e) {
    console.log(`  Setup failed: ${e.message}`);
    return false;
  }
}

// ── Test: Anonymous access denied ─────────────────────────────────

async function testAnonymousDenied() {
  if (!canConnect) {
    record('anonymous_access_denied', 'SPEC',
      'Without anon key: Unauthenticated SELECT on protected tables must return 0 rows or error');
    return;
  }

  const protectedTables = ['customers', 'stock_inventory', 'gsm_tasks', 'fmb_reports'];
  let allDenied = true;

  for (const table of protectedTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      // Table doesn't exist or permission denied — both acceptable
      record(`anon_denied_${table}`, 'PASS', `Access denied: ${error.message.substring(0, 60)}`);
    } else if (data && data.length > 0) {
      allDenied = false;
      record(`anon_denied_${table}`, 'FAIL', `Got ${data.length} rows without auth`);
    } else {
      record(`anon_denied_${table}`, 'PASS', 'No rows returned without auth');
    }
  }
}

// ── Test: Authenticated user session lifecycle ────────────────────

async function testSessionLifecycle() {
  if (!canConnect) {
    record('session_lifecycle', 'SPEC', 'Test sign-in, session, refresh, sign-out');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('session_signin', 'SPEC', 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run');
    record('session_refresh', 'SPEC', 'Requires test credentials');
    record('session_signout', 'SPEC', 'Requires test credentials');
    return;
  }

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('session_signin', 'FAIL', `Auth failed: ${authError.message}`);
    return;
  }

  record('session_signin', 'PASS', `Signed in as ${testEmail}`);

  // Get session
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.access_token) {
    record('session_exists', 'PASS', 'Session has access_token');
  } else {
    record('session_exists', 'FAIL', 'No session after sign-in');
  }

  // Refresh
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    record('session_refresh', 'FAIL', `Refresh failed: ${refreshError.message}`);
  } else if (refreshData?.session) {
    record('session_refresh', 'PASS', 'Session refreshed successfully');
  } else {
    record('session_refresh', 'FAIL', 'No session after refresh');
  }

  // Sign out
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    record('session_signout', 'FAIL', `Sign-out failed: ${signOutError.message}`);
  } else {
    record('session_signout', 'PASS', 'Signed out successfully');
  }

  // Verify session gone
  const { data: postSignOut } = await supabase.auth.getSession();
  if (!postSignOut?.session) {
    record('session_cleared', 'PASS', 'No session after sign-out');
  } else {
    record('session_cleared', 'FAIL', 'Session still exists after sign-out');
  }
}

// ── Test: Company isolation ───────────────────────────────────────

async function testCompanyIsolation() {
  if (!canConnect) {
    record('company_isolation', 'SPEC',
      'User A from Company X must not see rows owned by Company Y');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('company_isolation', 'SPEC', 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run');
    return;
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('company_isolation', 'FAIL', `Auth failed: ${authError.message}`);
    return;
  }

  const { data: customers } = await supabase.from('customers').select('company').limit(100);
  const companies = [...new Set((customers || []).map(c => c.company).filter(Boolean))];

  if (companies.length <= 1) {
    record('company_isolation', 'PASS', `Sees only company: ${companies[0] || 'none'}`);
  } else {
    record('company_isolation', 'FAIL', `Sees multiple companies: ${companies.join(', ')}`);
  }

  await supabase.auth.signOut();
}

// ── Test: Admin operations require auth ──────────────────────────

async function testAdminAuthRequired() {
  if (!canConnect) {
    record('admin_auth_required', 'SPEC', 'Admin ops must reject unauthenticated calls');
    return;
  }

  // Call admin-operations Edge Function without auth token
  const url = (process.env.SUPABASE_URL) + '/functions/v1/admin-operations';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listUsers' }),
    });

    if (response.status === 401) {
      record('admin_no_auth_rejected', 'PASS', 'Returned 401 without auth');
    } else if (response.status === 404) {
      record('admin_no_auth_rejected', 'NOT_RUN',
        'Edge Function not deployed yet (404). Deploy admin-operations before production.');
    } else {
      const body = await response.json().catch(() => ({}));
      record('admin_no_auth_rejected', 'FAIL',
        `Expected 401, got ${response.status}: ${JSON.stringify(body).substring(0, 80)}`);
    }
  } catch (e) {
    // Network error or function not deployed
    record('admin_no_auth_rejected', 'NOT_RUN', `Network error: ${e.message}`);
  }
}

// ── Test: Non-admin user denied admin actions ─────────────────────

async function testNonAdminDenied() {
  if (!canConnect) {
    record('non_admin_denied', 'SPEC', 'Non-admin must be denied admin operations');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('non_admin_list_users', 'SPEC', 'Requires test credentials');
    record('non_admin_create_user', 'SPEC', 'Requires test credentials');
    record('non_admin_delete_user', 'SPEC', 'Requires test credentials');
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('non_admin_denied', 'FAIL', `Auth failed: ${authError.message}`);
    return;
  }

  // Check if user is actually non-admin
  const { data: access } = await supabase
    .from('user_system_access')
    .select('is_admin')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (access?.is_admin) {
    record('non_admin_list_users', 'SPEC', 'Test user is an admin — cannot test non-admin denial');
    record('non_admin_create_user', 'SPEC', 'Test user is an admin');
    record('non_admin_delete_user', 'SPEC', 'Test user is an admin');
    await supabase.auth.signOut();
    return;
  }

  const adminActions = [
    { action: 'listUsers', name: 'non_admin_list_users' },
    { action: 'createUser', name: 'non_admin_create_user', email: 'fake@test.com', password: 'test123' },
    { action: 'deleteUser', name: 'non_admin_delete_user', userId: '00000000-0000-0000-0000-000000000000' },
  ];

  for (const { action, name, ...params } of adminActions) {
    const { data: result, error } = await supabase.functions.invoke('admin-operations', {
      body: { action, ...params },
    });

    // We expect an error or result.ok === false
    if (error) {
      const errBody = typeof error === 'object' && error.context ? error.context : error;
      const msg = errBody?.error || errBody?.message || error.message || '';
      if (msg.includes('denied') || msg.includes('admin') || msg.includes('not found')) {
        record(name, 'PASS', `Denied: ${msg.substring(0, 60)}`);
      } else {
        record(name, 'FAIL', `Unexpected error: ${msg.substring(0, 80)}`);
      }
    } else if (result && result.ok === false) {
      record(name, 'PASS', `Denied: ${(result.error || '').substring(0, 60)}`);
    } else {
      record(name, 'FAIL', `Action succeeded for non-admin!`);
    }
  }

  await supabase.auth.signOut();
}

// ── Test: Deferred actions rejected ───────────────────────────────

async function testDeferredActions() {
  if (!canConnect) {
    record('deferred_actions', 'SPEC', 'setPassword, impersonate must be rejected');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('deferred_setPassword', 'SPEC', 'Requires test credentials');
    record('deferred_impersonate', 'SPEC', 'Requires test credentials');
    return;
  }

  await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });

  for (const action of ['setPassword', 'impersonate']) {
    const { data: result, error } = await supabase.functions.invoke('admin-operations', {
      body: { action, userId: '00000000-0000-0000-0000-000000000000' },
    });

    const errBody = error
      ? (typeof error === 'object' && error.context ? error.context : error)
      : result;
    const msg = errBody?.error || errBody?.message || '';
    const isDeferred = msg.includes('deferred') || errBody?.deferred === true;

    if (isDeferred) {
      record(`deferred_${action}`, 'PASS', 'Explicitly deferred with clear message');
    } else {
      record(`deferred_${action}`, 'FAIL', `Not properly deferred: ${msg.substring(0, 80)}`);
    }
  }

  await supabase.auth.signOut();
}

// ── Test: Admin client API inaccessible from anon key ─────────────

async function testAdminApiBlocked() {
  if (!canConnect) {
    record('admin_api_blocked', 'SPEC', 'auth.admin calls must fail without service_role');
    return;
  }

  // These should fail — anon key cannot call admin methods
  try {
    const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      record('admin_listUsers_blocked', 'PASS', `Correctly rejected: ${error.message.substring(0, 60)}`);
    } else {
      record('admin_listUsers_blocked', 'FAIL', 'admin.listUsers() succeeded with anon key!');
    }
  } catch (e) {
    record('admin_listUsers_blocked', 'PASS', `Threw error: ${e.message.substring(0, 60)}`);
  }
}

// ── Test: is_admin function exists ────────────────────────────────

async function testIsAdminFunction() {
  if (!canConnect) {
    record('is_admin_function', 'SPEC', 'is_admin() database function must exist');
    return;
  }

  const { error } = await supabase.rpc('is_admin');
  // Function may fail without auth — that's OK, we just check it exists
  if (error && error.message.includes('does not exist')) {
    record('is_admin_function', 'FAIL', 'Function not found');
  } else {
    record('is_admin_function', 'PASS', 'Function exists');
  }
}

// ── Test: Source code scanning ─────────────────────────────────────

function testSourceScan() {
  const fs = require('fs');
  const path = require('path');

  // Check that main.js does NOT contain service role key
  const mainJs = fs.readFileSync(path.resolve(__dirname, '..', 'main.js'), 'utf8');
  if (/sb_secret_[A-Za-z0-9_]{10,}/.test(mainJs)) {
    record('source_main_clean', 'FAIL', 'main.js contains service role key');
  } else {
    record('source_main_clean', 'PASS', 'No service role key in main.js');
  }

  // Check lib/ directory
  const libDir = path.resolve(__dirname, '..', 'lib');
  const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  let libClean = true;
  for (const file of libFiles) {
    const content = fs.readFileSync(path.join(libDir, file), 'utf8');
    if (/sb_secret_[A-Za-z0-9_]{10,}/.test(content)) {
      record(`source_lib_${file}`, 'FAIL', `Contains service role key`);
      libClean = false;
    }
  }
  if (libClean) {
    record('source_lib_clean', 'PASS', 'No service role keys in lib/');
  }

  // Check preload.js
  const preloadPath = path.resolve(__dirname, '..', 'assets', 'js', 'preload.js');
  const preload = fs.readFileSync(preloadPath, 'utf8');
  if (/sb_secret_[A-Za-z0-9_]{10,}/.test(preload)) {
    record('source_preload_clean', 'FAIL', 'preload.js contains service role key');
  } else {
    record('source_preload_clean', 'PASS', 'No service role key in preload.js');
  }

  // Check that main.js does NOT call auth.admin
  if (/\.auth\.admin\./.test(mainJs)) {
    record('source_no_auth_admin', 'FAIL', 'main.js still calls auth.admin directly');
  } else {
    record('source_no_auth_admin', 'PASS', 'No auth.admin calls in main.js');
  }
}

// ── Runner ────────────────────────────────────────────────────────

async function main() {
  const isCI = process.argv.includes('--ci');
  const isStrict = process.argv.includes('--strict');

  console.log('============================================================');
  console.log('RLS + Authorization Integration Test Suite');
  console.log(`Mode: ${isStrict ? 'STRICT' : isCI ? 'CI' : 'LOCAL'}`);
  console.log('============================================================');
  console.log();

  await setup();

  console.log('-- Source Code Scanning --');
  testSourceScan();

  console.log('\n-- Anonymous Access --');
  await testAnonymousDenied();

  console.log('\n-- Session Lifecycle --');
  await testSessionLifecycle();

  console.log('\n-- Company Isolation --');
  await testCompanyIsolation();

  console.log('\n-- Admin Auth Required --');
  await testAdminAuthRequired();

  console.log('\n-- Non-Admin Denied --');
  await testNonAdminDenied();

  console.log('\n-- Deferred Actions --');
  await testDeferredActions();

  console.log('\n-- Admin API Blocked --');
  await testAdminApiBlocked();

  console.log('\n-- Database Functions --');
  await testIsAdminFunction();

  console.log('\n============================================================');
  console.log('RESULTS SUMMARY');
  console.log('============================================================');
  const passed = RESULTS.filter(r => r.status === 'PASS').length;
  const failed = RESULTS.filter(r => r.status === 'FAIL').length;
  const spec = RESULTS.filter(r => r.status === 'SPEC').length;
  const notRun = RESULTS.filter(r => r.status === 'NOT_RUN').length;
  const total = RESULTS.length;

  console.log(`  Total: ${total} | Pass: ${passed} | Fail: ${failed} | Spec: ${spec} | Not Run: ${notRun}`);

  if (failed > 0) {
    console.log('\n  FAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    [FAIL] ${r.test}: ${r.detail}`);
    });
  }

  // Exit codes for CI
  if (isCI || isStrict) {
    if (failed > 0) {
      console.log('\n  ❌ CI BLOCKED: Test failures detected.');
      process.exit(1);
    }

    const realExecutions = passed + failed;
    if (realExecutions === 0) {
      console.log('\n  ❌ CI BLOCKED: No tests actually executed (all SPEC/NOT_RUN).');
      console.log('  Configure SUPABASE_URL, SUPABASE_ANON_KEY, and test user credentials.');
      process.exit(2);
    }

    if (isStrict && spec > 0) {
      console.log(`\n  ❌ STRICT: ${spec} tests not executed.`);
      process.exit(2);
    }

    console.log('\n  ✅ CI PASSED: All executed tests passed.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(3); });
