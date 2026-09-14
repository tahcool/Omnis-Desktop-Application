/**
 * test_audit_spoofing.js — Audit identity verification tests
 *
 * Tests both source pinning AND user_email spoofing via direct INSERT.
 * Reads the persisted row through the service_role (trusted) connection.
 *
 * CONFIRMED FINDINGS from schema inspection:
 *   - `authenticated` role has INSERT grant on ALL columns including user_email
 *   - RLS INSERT policy: WITH CHECK (true) — no column restriction
 *   - Trigger trg_pin_audit_source: pins source to 'client', does NOT touch user_email
 *   - user_email column: nullable TEXT, no DEFAULT, no constraint
 *
 * Therefore:
 *   - Source spoofing IS blocked (trigger pins to 'client')
 *   - user_email spoofing is NOT blocked — clients CAN insert arbitrary values
 *   - Backend audit identity (user_email set by Edge Function) must be
 *     distinguished from client-submitted user_email values
 *
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('ABORT: Missing env vars');
  process.exit(1);
}
if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  console.error('ABORT: Not local');
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const TEST_PASSWORD = 'Test1234!';

const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

async function runTests() {
  console.log('=== Audit Identity Spoofing Tests ===\n');

  const testEmail = `spoof-test-${Date.now()}@test.omnis.local`;
  const victimEmail = 'victim-admin@production.example';
  const marker = `spoof_${Date.now()}`;
  let testUser;

  try {
    // Create and login a test user
    const { data: userData, error: createErr } = await serviceClient.auth.admin.createUser({
      email: testEmail, password: TEST_PASSWORD, email_confirm: true,
    });
    if (createErr) throw new Error(`createUser: ${createErr.message}`);
    testUser = userData.user;

    const authClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: loginData, error: loginErr } = await authClient.auth.signInWithPassword({
      email: testEmail, password: TEST_PASSWORD,
    });
    if (loginErr) throw new Error(`login: ${loginErr.message}`);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
    });

    // Helper: insert and read back via service_role (trusted)
    async function insertAndCheck(client, fields, label) {
      const eventType = `test:${marker}_${label}`;
      const { error: insErr } = await client
        .from('omnis_audit_trail')
        .insert({ event_type: eventType, ...fields });

      if (insErr) return { error: insErr.message };

      const { data, error: readErr } = await serviceClient
        .from('omnis_audit_trail')
        .select('source, user_email, event_type')
        .eq('event_type', eventType)
        .single();

      if (readErr) return { error: readErr.message };
      return data;
    }

    // ── A. Source pinning (6 tests) ────────────────────────────────

    console.log('\n  -- A. Source field pinning --');

    // A1. Client attempts source='admin-operations' → must be pinned to 'client'
    const a1 = await insertAndCheck(userClient, { source: 'admin-operations' }, 'spoof_backend');
    record('A1_source_spoof_backend',
      !a1.error && a1.source === 'client' ? 'PASS' : 'FAIL',
      a1.error || `attempted 'admin-operations', stored '${a1.source}'`);

    // A2. Client source='backend' → pinned to 'client'
    const a2 = await insertAndCheck(userClient, { source: 'backend' }, 'spoof_generic');
    record('A2_source_spoof_generic',
      !a2.error && a2.source === 'client' ? 'PASS' : 'FAIL',
      a2.error || `attempted 'backend', stored '${a2.source}'`);

    // A3. Client source='client' → stays 'client'
    const a3 = await insertAndCheck(userClient, { source: 'client' }, 'honest_client');
    record('A3_source_honest',
      !a3.error && a3.source === 'client' ? 'PASS' : 'FAIL',
      a3.error || `stored '${a3.source}'`);

    // A4. Client source=NULL → set to 'client'
    const a4 = await insertAndCheck(userClient, { source: null }, 'null_source');
    record('A4_source_null_pinned',
      !a4.error && a4.source === 'client' ? 'PASS' : 'FAIL',
      a4.error || `NULL → stored '${a4.source}'`);

    // A5. Service-role source='admin-operations' → preserved
    const a5 = await insertAndCheck(serviceClient, { source: 'admin-operations' }, 'svc_backend');
    record('A5_service_source_preserved',
      !a5.error && a5.source === 'admin-operations' ? 'PASS' : 'FAIL',
      a5.error || `stored '${a5.source}'`);

    // A6. Service-role source='backend' → preserved
    const a6 = await insertAndCheck(serviceClient, { source: 'backend' }, 'svc_generic');
    record('A6_service_generic_preserved',
      !a6.error && a6.source === 'backend' ? 'PASS' : 'FAIL',
      a6.error || `stored '${a6.source}'`);

    // ── B. user_email identity spoofing (4 tests) ──────────────────

    console.log('\n  -- B. user_email identity spoofing --');

    // B1. Authenticated client inserts with someone else's user_email
    const b1 = await insertAndCheck(userClient,
      { source: 'client', user_email: victimEmail, details: { test: 'spoof_email' } },
      'email_spoof');

    if (b1.error) {
      // If blocked: trigger or RLS prevented the spoofed email
      record('B1_email_spoof_blocked', 'PASS',
        `Insert blocked: ${b1.error}`);
    } else if (b1.user_email === victimEmail) {
      // Spoofed email persisted — confirmed gap
      record('B1_email_spoof_persisted', 'PASS',
        `CONFIRMED GAP: client set user_email='${victimEmail}', stored as-is. ` +
        `Trigger does not pin user_email. Client audit identity is untrusted.`);
    } else if (b1.user_email === testEmail) {
      // Trigger or policy corrected it
      record('B1_email_spoof_corrected', 'PASS',
        `Corrected to caller email: '${b1.user_email}'`);
    } else {
      record('B1_email_spoof_unexpected', 'FAIL',
        `Unexpected: user_email='${b1.user_email}'`);
    }

    // B2. Client inserts with NULL user_email (normal client behavior)
    const b2 = await insertAndCheck(userClient,
      { source: 'client', user_email: null }, 'email_null');
    record('B2_email_null_accepted',
      !b2.error ? 'PASS' : 'FAIL',
      b2.error || `user_email=${b2.user_email === null ? 'NULL' : `'${b2.user_email}'`}`);

    // B3. Service-role sets user_email (backend legitimate behavior)
    const b3 = await insertAndCheck(serviceClient,
      { source: 'admin-operations', user_email: 'admin@example.com' }, 'svc_email');
    record('B3_service_email_preserved',
      !b3.error && b3.user_email === 'admin@example.com' ? 'PASS' : 'FAIL',
      b3.error || `service-role user_email='${b3.user_email}'`);

    // B4. Verify that source='client' rows with user_email should be
    // treated as untrusted in any audit query
    const { data: clientRows } = await serviceClient
      .from('omnis_audit_trail')
      .select('source, user_email')
      .like('event_type', `test:${marker}%`)
      .eq('source', 'client')
      .not('user_email', 'is', null);

    const spoofedClientRows = (clientRows || []).filter(r => r.user_email !== testEmail);
    record('B4_client_email_trust_boundary',
      spoofedClientRows.length > 0 ? 'PASS' : 'FAIL',
      spoofedClientRows.length > 0
        ? `DOCUMENTED: ${spoofedClientRows.length} client row(s) with non-caller user_email. ` +
          `Backend identity (source!='client') is trusted; client identity is not.`
        : 'No spoofed rows found (unexpected after B1)');

  } catch (e) {
    record('audit_spoofing', 'FAIL', e.message);
  } finally {
    if (testUser) {
      try { await serviceClient.auth.admin.deleteUser(testUser.id); } catch (_) {}
    }
  }

  // Print summary
  console.log('\n=== RESULTS ===');
  let passed = 0, failed = 0;
  RESULTS.forEach(r => { if (r.status === 'PASS') passed++; else failed++; });
  console.log(`Total: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  - ${r.name}: ${r.detail}`));
  }

  console.log('\n  TRUST BOUNDARY DOCUMENTATION:');
  console.log('  - source field: TRUSTED — trigger pins to "client" for non-service roles');
  console.log('  - user_email with source="admin-operations": TRUSTED — set by Edge Function');
  console.log('  - user_email with source="client": UNTRUSTED — client can set arbitrary value');
  console.log('  - Audit queries that need verified identity MUST filter on source != "client"');

  return { passed, failed, results: RESULTS };
}

if (require.main === module) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}

module.exports = { runTests };
