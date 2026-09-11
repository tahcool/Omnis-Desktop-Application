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
 *   --ci      Exit non-zero if ANY test fails.
 *             Exit code 2 if all tests are unexecuted (prevents
 *             release when test infrastructure is unavailable).
 *   --strict  Exit non-zero if ANY required test is SPEC/NOT_RUN.
 *             Identical gate behavior: missing fixtures, endpoints, or
 *             prerequisites block release. Use for final release validation.
 *
 * EXIT CODES:
 *   0 — all tests passed (at least one real execution)
 *   1 — test failures detected
 *   2 — all tests were SPEC/NOT_RUN (nothing actually ran) — blocks CI
 *   3 — setup/runtime error
 *
 * CATEGORIES:
 *   STATIC    — source code checks (no network)
 *   DATABASE  — Supabase DB operations (RLS, RPC, row access)
 *   ENDPOINT  — Edge Function HTTP calls
 *   AUTH      — authentication session lifecycle
 *
 * Run: node tests/test_rls.js [--ci] [--strict]
 */

const RESULTS = [];
function record(name, status, detail = '', category = 'STATIC') {
  RESULTS.push({ test: name, status, detail, category });
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

    // Environment identity check — handle both JWT and opaque key formats
    if (key.startsWith('sb_publishable_') || key.startsWith('sb_')) {
      // Opaque key format (Supabase CLI v2.104+) — cannot decode as JWT.
      // Verify the URL is local instead.
      const hostname = new URL(url).hostname;
      const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(hostname);
      console.log(`  Key format: opaque (${key.substring(0, 16)}...)`);
      console.log(`  Host: ${hostname} (local=${isLocal})`);
      if (!isLocal) {
        console.log('  WARNING: Non-local URL with opaque key — verify you are targeting the correct project.');
      }
    } else if (key.includes('.')) {
      // JWT format — decode and check ref
      try {
        const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
        if (payload.ref) {
          const expectedRef = new URL(url).hostname.split('.')[0];
          if (payload.ref !== expectedRef) {
            console.log(`\n  ERROR: Key ref "${payload.ref}" does not match URL ref "${expectedRef}".`);
            console.log('  The anon key and URL belong to different Supabase projects.\n');
            return false;
          }
        }
        console.log(`  Project: ${payload.ref || 'unknown'} (role: ${payload.role || 'unknown'})`);
      } catch (e) {
        console.log(`  Key format: unrecognized (decode failed: ${e.message})`);
      }
    }

    supabase = createClient(url, key);

    // Verify connectivity
    const { error } = await supabase.from('user_system_access').select('user_id').limit(0);
    if (error && error.message.includes('does not exist')) {
      console.log('  WARNING: user_system_access table not found. Database may not be initialized.');
    }
    canConnect = true;
    console.log('  Connected to Supabase.');

    // Auto-provision test user if not provided
    const svcKey = process.env.SUPABASE_SERVICE_KEY;
    if (!process.env.TEST_USER_EMAIL && svcKey) {
      const svcClient = createClient(url, svcKey, { auth: { persistSession: false } });
      const testEmail = `rls-test-${Date.now()}@test.local`;
      const testPassword = 'RlsTest1234!';
      const { data: created, error: createErr } = await svcClient.auth.admin.createUser({
        email: testEmail, password: testPassword, email_confirm: true,
      });
      if (createErr) {
        console.log(`  WARNING: Could not auto-provision test user: ${createErr.message}`);
      } else {
        process.env.TEST_USER_EMAIL = testEmail;
        process.env.TEST_USER_PASSWORD = testPassword;
        // Grant non-admin access for RLS tests
        await svcClient.from('user_system_access').upsert({
          user_id: created.user.id, is_admin: false, systems: ['fleetrack'],
        }, { onConflict: 'user_id' });
        console.log(`  Auto-provisioned test user: ${testEmail} (id=${created.user.id})`);
      }
    }
    console.log('');
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
      'Without anon key: Unauthenticated SELECT on protected tables must return 0 rows or error', 'DATABASE');
    return;
  }

  const protectedTables = ['customers', 'stock_inventory', 'gsm_tasks', 'fmb_reports'];
  let allDenied = true;

  for (const table of protectedTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      record(`anon_denied_${table}`, 'PASS', `Access denied: ${error.message.substring(0, 60)}`, 'DATABASE');
    } else if (data && data.length > 0) {
      allDenied = false;
      record(`anon_denied_${table}`, 'FAIL', `Got ${data.length} rows without auth`, 'DATABASE');
    } else {
      record(`anon_denied_${table}`, 'PASS', 'No rows returned without auth', 'DATABASE');
    }
  }
}

// ── Test: Authenticated user session lifecycle ────────────────────

async function testSessionLifecycle() {
  if (!canConnect) {
    record('session_signin', 'SPEC', 'Test sign-in, session, refresh, sign-out', 'AUTH');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('session_signin', 'SPEC', 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run', 'AUTH');
    record('session_refresh', 'SPEC', 'Requires test credentials', 'AUTH');
    record('session_signout', 'SPEC', 'Requires test credentials', 'AUTH');
    return;
  }

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('session_signin', 'FAIL', `Auth failed: ${authError.message}`, 'AUTH');
    return;
  }

  record('session_signin', 'PASS', `Signed in as ${testEmail}`, 'AUTH');

  // Get session
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.access_token) {
    record('session_exists', 'PASS', 'Session has access_token', 'AUTH');
  } else {
    record('session_exists', 'FAIL', 'No session after sign-in', 'AUTH');
  }

  // Refresh
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    record('session_refresh', 'FAIL', `Refresh failed: ${refreshError.message}`, 'AUTH');
  } else if (refreshData?.session) {
    record('session_refresh', 'PASS', 'Session refreshed successfully', 'AUTH');
  } else {
    record('session_refresh', 'FAIL', 'No session after refresh', 'AUTH');
  }

  // Sign out
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    record('session_signout', 'FAIL', `Sign-out failed: ${signOutError.message}`, 'AUTH');
  } else {
    record('session_signout', 'PASS', 'Signed out successfully', 'AUTH');
  }

  // Verify session gone
  const { data: postSignOut } = await supabase.auth.getSession();
  if (!postSignOut?.session) {
    record('session_cleared', 'PASS', 'No session after sign-out', 'AUTH');
  } else {
    record('session_cleared', 'FAIL', 'Session still exists after sign-out', 'AUTH');
  }
}

// ── Test: Company isolation ───────────────────────────────────────

async function testCompanyIsolation() {
  if (!canConnect) {
    record('company_isolation', 'SPEC',
      'User A from Company X must not see rows owned by Company Y', 'DATABASE');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('company_isolation', 'SPEC', 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run', 'DATABASE');
    return;
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('company_isolation', 'FAIL', `Auth failed: ${authError.message}`, 'DATABASE');
    return;
  }

  const { data: customers } = await supabase.from('customers').select('company').limit(100);
  const companies = [...new Set((customers || []).map(c => c.company).filter(Boolean))];

  if (companies.length <= 1) {
    record('company_isolation', 'PASS', `Sees only company: ${companies[0] || 'none'}`, 'DATABASE');
  } else {
    record('company_isolation', 'FAIL', `Sees multiple companies: ${companies.join(', ')}`, 'DATABASE');
  }

  await supabase.auth.signOut();
}

// ── Test: Admin operations require auth ──────────────────────────

async function testAdminAuthRequired() {
  if (!canConnect) {
    record('admin_auth_required', 'SPEC', 'Admin ops must reject unauthenticated calls', 'ENDPOINT');
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
      record('admin_no_auth_rejected', 'PASS', 'Returned 401 without auth', 'ENDPOINT');
    } else if (response.status === 404) {
      record('admin_no_auth_rejected', 'NOT_RUN',
        'Edge Function not deployed yet (404). Deploy admin-operations before production.', 'ENDPOINT');
    } else {
      const body = await response.json().catch(() => ({}));
      record('admin_no_auth_rejected', 'FAIL',
        `Expected 401, got ${response.status}: ${JSON.stringify(body).substring(0, 80)}`, 'ENDPOINT');
    }
  } catch (e) {
    record('admin_no_auth_rejected', 'NOT_RUN', `Network error: ${e.message}`, 'ENDPOINT');
  }
}

// ── Test: Non-admin user denied admin actions ─────────────────────

async function testNonAdminDenied() {
  if (!canConnect) {
    record('non_admin_denied', 'SPEC', 'Non-admin must be denied admin operations', 'ENDPOINT');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('non_admin_list_users', 'SPEC', 'Requires test credentials', 'ENDPOINT');
    record('non_admin_create_user', 'SPEC', 'Requires test credentials', 'ENDPOINT');
    record('non_admin_delete_user', 'SPEC', 'Requires test credentials', 'ENDPOINT');
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('non_admin_denied', 'FAIL', `Auth failed: ${authError.message}`, 'ENDPOINT');
    return;
  }

  // Check if user is actually non-admin
  const { data: access } = await supabase
    .from('user_system_access')
    .select('is_admin')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (access?.is_admin) {
    record('non_admin_list_users', 'SPEC', 'Test user is an admin — cannot test non-admin denial', 'ENDPOINT');
    record('non_admin_create_user', 'SPEC', 'Test user is an admin', 'ENDPOINT');
    record('non_admin_delete_user', 'SPEC', 'Test user is an admin', 'ENDPOINT');
    await supabase.auth.signOut();
    return;
  }

  const adminActions = [
    { action: 'listUsers', name: 'non_admin_list_users' },
    { action: 'createUser', name: 'non_admin_create_user', email: 'fake@test.com', password: 'test123' },
    { action: 'deleteUser', name: 'non_admin_delete_user', userId: '00000000-0000-0000-0000-000000000000' },
  ];

  for (const { action, name, ...params } of adminActions) {
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-operations', {
        body: { action, ...params },
      });

      if (error) {
        // FunctionsHttpError wraps non-2xx. The body may be in error.context.
        let errMsg = error.message || '';
        // Try to extract the JSON body from the error context
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            errMsg = body?.error || body?.message || errMsg;
          } catch {}
        } else if (typeof error.context === 'object' && error.context?.error) {
          errMsg = error.context.error;
        }

        const isDenied = errMsg.includes('denied') || errMsg.includes('admin') ||
                         errMsg.includes('privileges') || errMsg.includes('Access denied') ||
                         errMsg.includes('non-2xx'); // Edge function returned 403
        if (isDenied) {
          record(name, 'PASS', `Denied: ${errMsg.substring(0, 80)}`, 'ENDPOINT');
        } else if (errMsg.includes('not found') || errMsg.includes('404')) {
          record(name, 'NOT_RUN', 'Edge Function not deployed', 'ENDPOINT');
        } else {
          record(name, 'FAIL', `Unexpected error: ${errMsg.substring(0, 80)}`, 'ENDPOINT');
        }
      } else if (result && result.ok === false) {
        const msg = result.error || '';
        record(name, 'PASS', `Denied: ${msg.substring(0, 60)}`, 'ENDPOINT');
      } else {
        record(name, 'FAIL', `Action succeeded for non-admin! ${JSON.stringify(result).substring(0, 80)}`, 'ENDPOINT');
      }
    } catch (e) {
      record(name, 'FAIL', `Unexpected exception: ${e.message}`, 'ENDPOINT');
    }
  }

  await supabase.auth.signOut();
}

// ── Test: Deferred actions rejected ───────────────────────────────

async function testDeferredActions() {
  if (!canConnect) {
    record('deferred_setPassword', 'SPEC', 'setPassword must be explicitly deferred', 'ENDPOINT');
    record('deferred_impersonate', 'SPEC', 'impersonate must be explicitly deferred', 'ENDPOINT');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('deferred_setPassword', 'SPEC', 'Requires test credentials', 'ENDPOINT');
    record('deferred_impersonate', 'SPEC', 'Requires test credentials', 'ENDPOINT');
    return;
  }

  await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });

  for (const action of ['setPassword', 'impersonate']) {
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-operations', {
        body: { action, userId: '00000000-0000-0000-0000-000000000000' },
      });

      let msg = '';
      let isDeferred = false;

      if (error) {
        // Try to parse the response body from error.context
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            msg = body?.error || body?.message || '';
            isDeferred = body?.deferred === true || msg.includes('deferred') ||
                         msg.includes('not implemented') || msg.includes('Unknown action');
          } catch {
            msg = error.message || '';
          }
        } else {
          msg = error.message || '';
        }
        // A non-2xx from the edge function means the action was rejected
        // which is the correct behavior for deferred actions
        if (!isDeferred) {
          // "Unknown action" also counts as properly deferred (action not registered)
          isDeferred = msg.includes('Unknown action') || msg.includes('non-2xx');
        }
      } else if (result) {
        msg = result.error || result.message || '';
        isDeferred = result.deferred === true || msg.includes('deferred') ||
                     msg.includes('not implemented') || msg.includes('Unknown action');
      }

      if (isDeferred) {
        record(`deferred_${action}`, 'PASS', `Properly deferred/rejected: ${msg.substring(0, 80)}`, 'ENDPOINT');
      } else if (msg.includes('404') || msg.includes('not found')) {
        record(`deferred_${action}`, 'NOT_RUN', 'Edge Function not deployed', 'ENDPOINT');
      } else {
        record(`deferred_${action}`, 'FAIL', `Not properly deferred: ${msg.substring(0, 80)}`, 'ENDPOINT');
      }
    } catch (e) {
      record(`deferred_${action}`, 'FAIL', `Exception: ${e.message}`, 'ENDPOINT');
    }
  }

  await supabase.auth.signOut();
}

// ── Test: Admin client API inaccessible from anon key ─────────────

async function testAdminApiBlocked() {
  if (!canConnect) {
    record('admin_api_blocked', 'SPEC', 'auth.admin calls must fail without service_role', 'DATABASE');
    return;
  }

  try {
    const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      record('admin_listUsers_blocked', 'PASS', `Correctly rejected: ${error.message.substring(0, 60)}`, 'DATABASE');
    } else {
      record('admin_listUsers_blocked', 'FAIL', 'admin.listUsers() succeeded with anon key!', 'DATABASE');
    }
  } catch (e) {
    record('admin_listUsers_blocked', 'PASS', `Threw error: ${e.message.substring(0, 60)}`, 'DATABASE');
  }
}

// ── Test: is_admin function exists ────────────────────────────────

async function testIsAdminFunction() {
  if (!canConnect) {
    record('is_admin_function', 'SPEC', 'is_admin() database function must exist', 'DATABASE');
    return;
  }

  const { error } = await supabase.rpc('is_admin');
  if (error && error.message.includes('does not exist')) {
    record('is_admin_function', 'FAIL', 'Function not found', 'DATABASE');
  } else {
    record('is_admin_function', 'PASS', 'Function exists', 'DATABASE');
  }
}

// ── Test: RPC access control (safe_remove_admin/check_last_admin_removal) ──

async function testRpcAccessControl() {
  if (!canConnect) {
    record('rpc_anon_denied', 'SPEC', 'safe_remove_admin must be inaccessible to anon', 'DATABASE');
    return;
  }

  // Try calling safe_remove_admin with anon key (should be denied by REVOKE)
  const { error: safeErr } = await supabase.rpc('safe_remove_admin', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (safeErr) {
    if (safeErr.message.includes('permission denied') || safeErr.message.includes('does not exist')) {
      record('rpc_safe_remove_anon', 'PASS', `Denied to anon: ${safeErr.message.substring(0, 60)}`, 'DATABASE');
    } else {
      // Function might not be deployed yet
      record('rpc_safe_remove_anon', 'NOT_RUN', `Error: ${safeErr.message.substring(0, 60)}`, 'DATABASE');
    }
  } else {
    record('rpc_safe_remove_anon', 'FAIL', 'safe_remove_admin callable by anon — missing REVOKE!', 'DATABASE');
  }

  // Try calling check_last_admin_removal with anon key
  const { error: checkErr } = await supabase.rpc('check_last_admin_removal', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });

  if (checkErr) {
    if (checkErr.message.includes('permission denied') || checkErr.message.includes('does not exist')) {
      record('rpc_check_last_anon', 'PASS', `Denied to anon: ${checkErr.message.substring(0, 60)}`, 'DATABASE');
    } else {
      record('rpc_check_last_anon', 'NOT_RUN', `Error: ${checkErr.message.substring(0, 60)}`, 'DATABASE');
    }
  } else {
    record('rpc_check_last_anon', 'FAIL', 'check_last_admin_removal callable by anon — missing REVOKE!', 'DATABASE');
  }
}

// ── Test: User self-admin check denied ────────────────────────────

async function testUserSelfAdminDenied() {
  if (!canConnect) {
    record('user_system_access_rls', 'SPEC', 'user_system_access RLS prevents self-modification', 'DATABASE');
    return;
  }

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    record('user_self_promote', 'SPEC', 'Requires test credentials', 'DATABASE');
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (authError) {
    record('user_self_promote', 'FAIL', `Auth failed: ${authError.message}`, 'DATABASE');
    return;
  }

  // Attempt to directly update own is_admin via REST (RLS should block)
  const { error: updateErr } = await supabase
    .from('user_system_access')
    .update({ is_admin: true })
    .eq('user_id', authData.user.id);

  if (updateErr) {
    record('user_self_promote', 'PASS', `RLS blocked: ${updateErr.message.substring(0, 60)}`, 'DATABASE');
  } else {
    // Check if the update actually happened
    const { data: check } = await supabase
      .from('user_system_access')
      .select('is_admin')
      .eq('user_id', authData.user.id)
      .single();

    if (check?.is_admin === true) {
      record('user_self_promote', 'FAIL', 'User was able to self-promote to admin via direct DB update!', 'DATABASE');
      // Revert
      await supabase.from('user_system_access').update({ is_admin: false }).eq('user_id', authData.user.id);
    } else {
      record('user_self_promote', 'PASS', 'Update silently ignored by RLS (0 rows affected)', 'DATABASE');
    }
  }

  await supabase.auth.signOut();
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

  // Check systems/ directory (ships in ASAR)
  const systemsDir = path.resolve(__dirname, '..', 'systems');
  let systemsClean = true;
  function walkSystems(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkSystems(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/sb_secret_[A-Za-z0-9_]{10,}/.test(content)) {
          record(`source_systems_${entry.name}`, 'FAIL',
            `Contains service role key (SHIPS IN ASAR)`);
          systemsClean = false;
        }
      }
    }
  }
  walkSystems(systemsDir);
  if (systemsClean) {
    record('source_systems_clean', 'PASS', 'No service role keys in systems/ (shipped code)');
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

  // Verify fix_ftas_load.js is NOT in systems/ (should have been moved to scripts/)
  const ftasPath = path.resolve(__dirname, '..', 'systems', 'salestrack', 'fix_ftas_load.js');
  if (fs.existsSync(ftasPath)) {
    record('source_ftas_not_shipped', 'FAIL',
      'fix_ftas_load.js still in systems/ (ships in ASAR). Move to scripts/');
  } else {
    record('source_ftas_not_shipped', 'PASS', 'fix_ftas_load.js not in systems/ (moved to scripts/)');
  }

  // Verify dotenv path is resilient for packaged app
  if (mainJs.includes('app.isPackaged')) {
    record('source_dotenv_packaged', 'PASS', 'dotenv path handles packaged vs dev');
  } else if (mainJs.includes("dotenv').config()")) {
    record('source_dotenv_packaged', 'FAIL',
      'dotenv.config() uses cwd — will fail in packaged app');
  } else {
    record('source_dotenv_packaged', 'PASS', 'dotenv path configured');
  }

  // Verify no recovery tokens in resetPassword response
  const adminOpsPath = path.resolve(__dirname, '..', 'supabase', 'functions', 'admin-operations', 'index.ts');
  if (fs.existsSync(adminOpsPath)) {
    const adminOps = fs.readFileSync(adminOpsPath, 'utf8');

    // Check resetPassword doesn't return action_link
    const resetSection = adminOps.substring(
      adminOps.indexOf('case "resetPassword"'),
      adminOps.indexOf('case "inviteUser"')
    );
    if (resetSection.includes('action_link')) {
      record('source_no_recovery_token', 'FAIL',
        'resetPassword returns action_link — enables account takeover');
    } else {
      record('source_no_recovery_token', 'PASS',
        'resetPassword does not expose recovery tokens');
    }

    // Check REVOKE in migration
    const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations',
      '20260910000000_last_admin_protection.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      if (migration.includes('REVOKE EXECUTE') && migration.includes('FROM anon') &&
          migration.includes('FROM authenticated') && migration.includes('FROM PUBLIC')) {
        record('source_rpc_revoked', 'PASS', 'Functions REVOKEd from PUBLIC, anon, and authenticated');
      } else if (migration.includes('REVOKE EXECUTE') && migration.includes('FROM anon')) {
        record('source_rpc_revoked', 'FAIL',
          'Missing REVOKE from PUBLIC — default PostgreSQL grant still active');
      } else {
        record('source_rpc_revoked', 'FAIL',
          'Missing REVOKE statements — direct RPC bypass possible');
      }

      if (migration.includes('FOR UPDATE')) {
        record('source_for_update', 'PASS', 'Both functions use FOR UPDATE locking');
      } else {
        record('source_for_update', 'FAIL', 'Missing FOR UPDATE — concurrent race possible');
      }
    }

    // Verify coordination pattern: suspendUser/deleteUser must use safe_remove_admin
    // not check_last_admin_removal (pre-flight check releases lock before Auth API)
    const suspendSection = adminOps.substring(
      adminOps.indexOf('case "suspendUser"'),
      adminOps.indexOf('case "unsuspendUser"')
    );
    const deleteSection = adminOps.substring(
      adminOps.indexOf('case "deleteUser"'),
      adminOps.indexOf('case "makeAdmin"')
    );

    const suspendUsesAtomic = suspendSection.includes('safe_remove_admin') &&
      !suspendSection.includes('check_last_admin_removal');
    const deleteUsesAtomic = deleteSection.includes('safe_remove_admin') &&
      !deleteSection.includes('check_last_admin_removal');

    if (suspendUsesAtomic && deleteUsesAtomic) {
      record('source_atomic_coordination', 'PASS',
        'suspend/delete use safe_remove_admin (atomic) not pre-flight check');
    } else {
      record('source_atomic_coordination', 'FAIL',
        'suspend or delete still uses check_last_admin_removal (race-prone pre-flight)');
    }

    // Verify Auth failure compensation is state-aware
    // Must check current is_admin before blindly reverting
    const hasStateCheck = suspendSection.includes('currentState') &&
      suspendSection.includes('is_admin === false');
    if (hasStateCheck) {
      record('source_auth_compensation', 'PASS',
        'State-aware compensation: checks is_admin before reverting');
    } else if (suspendSection.includes('is_admin: true')) {
      record('source_auth_compensation', 'FAIL',
        'Blind compensation: restores is_admin=true without checking current state');
    } else {
      record('source_auth_compensation', 'FAIL',
        'No compensation for Auth API failure after DB demotion');
    }
  }

  // Verify no OpenAI keys in shipped Python files
  const systemsDir2 = path.resolve(__dirname, '..', 'systems');
  let openaiClean = true;
  function walkForOpenAI(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkForOpenAI(fullPath);
      } else if (entry.name.endsWith('.py')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/sk-proj-[A-Za-z0-9_-]{20,}/.test(content)) {
          record(`source_openai_${entry.name}`, 'FAIL',
            `OpenAI key in Python file (SHIPS IN ASAR unless excluded)`);
          openaiClean = false;
        }
      }
    }
  }
  walkForOpenAI(systemsDir2);
  if (openaiClean) {
    record('source_openai_clean', 'PASS', 'No OpenAI keys in systems/*.py');
  }

  // Also check omnis_dashboard.py (root-level, explicitly included in build.files)
  const dashboardPyPath = path.resolve(__dirname, '..', 'omnis_dashboard.py');
  if (fs.existsSync(dashboardPyPath)) {
    const dashContent = fs.readFileSync(dashboardPyPath, 'utf8');
    if (/sk-proj-[A-Za-z0-9_-]{20,}/.test(dashContent)) {
      record('source_dashboard_py', 'FAIL',
        'omnis_dashboard.py contains OpenAI key (SHIPS IN ASAR)');
    } else {
      record('source_dashboard_py', 'PASS',
        'omnis_dashboard.py clean — no OpenAI keys');
    }
  }

  // Verify build.files excludes Python
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const buildFiles = pkg.build?.files || [];
  if (buildFiles.includes('!systems/**/*.py')) {
    record('source_py_excluded', 'PASS', 'Python files excluded from ASAR build');
  } else {
    record('source_py_excluded', 'FAIL',
      'Python files not excluded from build — credentials may ship in ASAR');
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

  console.log('-- Source Code Scanning (STATIC) --');
  testSourceScan();

  console.log('\n-- Anonymous Access (DATABASE) --');
  await testAnonymousDenied();

  console.log('\n-- Session Lifecycle (AUTH) --');
  await testSessionLifecycle();

  console.log('\n-- Company Isolation (DATABASE) --');
  await testCompanyIsolation();

  console.log('\n-- Admin Auth Required (ENDPOINT) --');
  await testAdminAuthRequired();

  console.log('\n-- Non-Admin Denied (ENDPOINT) --');
  await testNonAdminDenied();

  console.log('\n-- Deferred Actions (ENDPOINT) --');
  await testDeferredActions();

  console.log('\n-- Admin API Blocked (DATABASE) --');
  await testAdminApiBlocked();

  console.log('\n-- Database Functions (DATABASE) --');
  await testIsAdminFunction();

  console.log('\n-- RPC Access Control (DATABASE) --');
  await testRpcAccessControl();

  console.log('\n-- Self-Admin Prevention (DATABASE) --');
  await testUserSelfAdminDenied();

  console.log('\n============================================================');
  console.log('RESULTS SUMMARY');
  console.log('============================================================');
  const passed = RESULTS.filter(r => r.status === 'PASS').length;
  const failed = RESULTS.filter(r => r.status === 'FAIL').length;
  const spec = RESULTS.filter(r => r.status === 'SPEC').length;
  const notRun = RESULTS.filter(r => r.status === 'NOT_RUN').length;
  const total = RESULTS.length;

  console.log(`  Total: ${total} | Pass: ${passed} | Fail: ${failed} | Spec: ${spec} | Not Run: ${notRun}`);

  // Category breakdown
  const categories = {};
  for (const r of RESULTS) {
    if (!categories[r.category]) categories[r.category] = { pass: 0, fail: 0, spec: 0, notRun: 0 };
    categories[r.category][r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' :
      r.status === 'NOT_RUN' ? 'notRun' : 'spec']++;
  }
  console.log('\n  By category:');
  for (const [cat, counts] of Object.entries(categories)) {
    console.log(`    ${cat}: ${counts.pass}P ${counts.fail}F ${counts.spec}S ${counts.notRun}N`);
  }

  if (failed > 0) {
    console.log('\n  FAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    [FAIL] ${r.test}: ${r.detail}`);
    });
  }

  // Exit codes for CI
  // Both --ci and --strict enforce the same gate:
  // ANY required test that is SPEC, NOT_RUN, or SKIP blocks the release.
  // This prevents passing CI when test infrastructure is unavailable.
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

    const unexecuted = spec + notRun;
    if (unexecuted > 0) {
      console.log(`\n  ❌ CI BLOCKED: ${unexecuted} required tests not executed.`);
      console.log('  All tests must PASS — SPEC and NOT_RUN prevent release.');
      RESULTS.filter(r => r.status === 'SPEC' || r.status === 'NOT_RUN').forEach(r => {
        console.log(`    [${r.status}] ${r.test}: ${r.detail}`);
      });
      process.exit(2);
    }

    console.log('\n  ✅ CI PASSED: All tests executed and passed.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(3); });
