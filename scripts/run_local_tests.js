#!/usr/bin/env node
/**
 * run_local_tests.js — Full local integration test orchestrator.
 *
 * Requires: Local Supabase running (supabase start).
 * Extracts local credentials from `supabase status`.
 * Applies migrations, creates test fixtures, runs all test suites.
 *
 * Usage:
 *   node scripts/run_local_tests.js
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    const result = execSync(cmd, {
      cwd: opts.cwd || WORKSPACE,
      encoding: 'utf8',
      timeout: opts.timeout || 60000,
      env: { ...process.env, ...opts.env },
    });
    return result.trim();
  } catch (e) {
    if (opts.ignoreError) {
      return e.stdout?.trim() || e.message;
    }
    throw e;
  }
}

console.log('=== Local Integration Test Orchestrator ===\n');

// Step 1: Get local Supabase credentials
console.log('--- Step 1: Extract local Supabase credentials ---');
let statusOutput;
try {
  statusOutput = run('supabase status');
} catch (e) {
  console.error('Supabase is not running. Start with: supabase start');
  process.exit(1);
}

// Parse credentials from status output
function extractField(output, field) {
  const match = output.match(new RegExp(`${field}:\\s+(.+)`));
  return match ? match[1].trim() : null;
}

const API_URL = extractField(statusOutput, 'API URL');
const ANON_KEY = extractField(statusOutput, 'anon key');
const SERVICE_KEY = extractField(statusOutput, 'service_role key');
const DB_URL = extractField(statusOutput, 'DB URL');

if (!API_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Could not extract credentials from supabase status');
  console.error(statusOutput);
  process.exit(1);
}

console.log(`  API URL: ${API_URL}`);
console.log(`  Anon key: ${ANON_KEY.substring(0, 20)}...`);
console.log(`  Service key: ${SERVICE_KEY.substring(0, 20)}...`);

// Step 2: Apply migration
console.log('\n--- Step 2: Apply migration ---');
const migrationFile = path.join(WORKSPACE, 'supabase', 'migrations', '20260910000000_last_admin_protection.sql');
try {
  // Use supabase db push to apply all pending migrations
  const pushResult = run('supabase db push', { timeout: 30000, ignoreError: true });
  console.log(pushResult);
} catch (e) {
  console.warn('Migration push failed, trying direct SQL...');
  try {
    run(`supabase db reset --linked false`, { timeout: 60000, ignoreError: true });
  } catch {}
}

// Step 3: Run static tests
console.log('\n--- Step 3: Static source tests ---');
const env = {
  SUPABASE_URL: API_URL,
  SUPABASE_ANON_KEY: ANON_KEY,
  TEST_USER_EMAIL: 'testadmin@test.local',
  TEST_USER_PASSWORD: 'Test1234!',
};

const staticResult = spawnSync('node', ['tests/test_rls.js'], {
  cwd: WORKSPACE,
  env: { ...process.env, ...env },
  encoding: 'utf8',
  timeout: 30000,
});
console.log(staticResult.stdout);
if (staticResult.stderr) console.error(staticResult.stderr);
console.log(`Exit code: ${staticResult.status}`);

// Step 4: Create test fixtures for integration tests
console.log('\n--- Step 4: Create test fixtures ---');
const fixtureScript = `
const { createClient } = require('@supabase/supabase-js');
const admin = createClient('${API_URL}', '${SERVICE_KEY}');

async function createFixtures() {
  // Create admin user
  const { data: u1, error: e1 } = await admin.auth.admin.createUser({
    email: 'testadmin@test.local',
    password: 'Test1234!',
    email_confirm: true,
    app_metadata: { role: 'admin' },
  });
  if (e1 && !e1.message.includes('already')) throw e1;
  const adminId = u1?.user?.id;
  console.log('Admin user:', adminId || 'already exists');

  // Create regular user
  const { data: u2, error: e2 } = await admin.auth.admin.createUser({
    email: 'testuser@test.local',
    password: 'Test1234!',
    email_confirm: true,
  });
  if (e2 && !e2.message.includes('already')) throw e2;
  const userId = u2?.user?.id;
  console.log('Regular user:', userId || 'already exists');

  // Set admin access
  if (adminId) {
    await admin.from('user_system_access').upsert({
      user_id: adminId,
      is_admin: true,
      systems: ['fleetrack', 'salestrack'],
    }, { onConflict: 'user_id' });
  }
  if (userId) {
    await admin.from('user_system_access').upsert({
      user_id: userId,
      is_admin: false,
      systems: ['fleetrack'],
    }, { onConflict: 'user_id' });
  }

  console.log('Fixtures created.');
}

createFixtures().catch(e => { console.error(e); process.exit(1); });
`;

const fixtureResult = spawnSync('node', ['-e', fixtureScript], {
  cwd: WORKSPACE,
  encoding: 'utf8',
  timeout: 15000,
});
console.log(fixtureResult.stdout);
if (fixtureResult.stderr) console.error(fixtureResult.stderr);

// Step 5: Run integration tests with credentials
console.log('\n--- Step 5: Integration tests (strict) ---');
const intEnv = {
  SUPABASE_URL: API_URL,
  SUPABASE_ANON_KEY: ANON_KEY,
  TEST_USER_EMAIL: 'testadmin@test.local',
  TEST_USER_PASSWORD: 'Test1234!',
};

const intResult = spawnSync('node', ['tests/test_rls.js', '--ci'], {
  cwd: WORKSPACE,
  env: { ...process.env, ...intEnv },
  encoding: 'utf8',
  timeout: 60000,
});
console.log(intResult.stdout);
if (intResult.stderr) console.error(intResult.stderr);
console.log(`Integration exit code: ${intResult.status}`);

// Step 6: Run concurrency tests
console.log('\n--- Step 6: Concurrency & RPC tests ---');
const concEnv = {
  SUPABASE_URL: API_URL,
  SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_SERVICE_KEY: SERVICE_KEY,
};

const concResult = spawnSync('node', ['tests/test_concurrency.js'], {
  cwd: WORKSPACE,
  env: { ...process.env, ...concEnv },
  encoding: 'utf8',
  timeout: 60000,
});
console.log(concResult.stdout);
if (concResult.stderr) console.error(concResult.stderr);
console.log(`Concurrency exit code: ${concResult.status}`);

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Static tests: exit ${staticResult.status}`);
console.log(`Integration tests: exit ${intResult.status}`);
console.log(`Concurrency tests: exit ${concResult.status}`);

const anyFail = staticResult.status !== 0 || intResult.status !== 0 || concResult.status !== 0;
if (anyFail) {
  console.log('\n❌ SOME TESTS FAILED');
} else {
  console.log('\n✅ ALL TESTS PASSED');
}

process.exit(anyFail ? 1 : 0);
