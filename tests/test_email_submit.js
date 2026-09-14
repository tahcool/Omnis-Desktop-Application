/**
 * test_email_submit.js — Email-submit Edge Function integration test
 *
 * Tests the email-submit function with provisioned local schema:
 *   - omnis_email_queue (full columns)
 *   - omnis_email_config (with synthetic salestrack config)
 *
 * Uses the actual supported actions (send, getConfig, cancelScheduled)
 * and verifies persisted state through trusted service_role queries.
 *
 * admin-config.ts: zero diff between presentation and dev worktree.
 * This test exercises the shared import path end-to-end.
 *
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 * Requires: Local Edge Functions served (email-submit)
 * Requires: omnis_email_queue and omnis_email_config tables provisioned
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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

async function callEmailSubmit(token, action, params = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${FUNCTIONS_URL}/email-submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...params }),
  });
  let body;
  try { body = await resp.json(); } catch (_) { body = {}; }
  return { status: resp.status, body };
}

async function runTests() {
  console.log('=== Email-Submit Integration Tests ===\n');

  const adminEmail = `email-admin-${Date.now()}@test.omnis.local`;
  const nonAdminEmail = `email-nonadmin-${Date.now()}@test.omnis.local`;
  let adminUser, nonAdminUser;
  let scheduledEmailId = null;

  try {
    // Verify prerequisites
    const { data: configCheck } = await serviceClient
      .from('omnis_email_config')
      .select('system')
      .eq('system', 'salestrack')
      .maybeSingle();
    if (!configCheck) {
      console.error('ABORT: omnis_email_config not provisioned (run setup_local_db.js)');
      record('prerequisite_config', 'FAIL', 'omnis_email_config table or salestrack row missing');
      return { passed: 0, failed: 1, results: RESULTS };
    }

    // Create test users
    const { data: au } = await serviceClient.auth.admin.createUser({
      email: adminEmail, password: TEST_PASSWORD, email_confirm: true,
    });
    adminUser = au.user;
    await serviceClient.from('user_system_access').upsert({
      user_id: adminUser.id, is_admin: true, systems: ['salestrack'],
    }, { onConflict: 'user_id' });

    const { data: nu } = await serviceClient.auth.admin.createUser({
      email: nonAdminEmail, password: TEST_PASSWORD, email_confirm: true,
    });
    nonAdminUser = nu.user;

    // Login
    const ac = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: al } = await ac.auth.signInWithPassword({ email: adminEmail, password: TEST_PASSWORD });
    const adminToken = al.session.access_token;

    const nc = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: nl } = await nc.auth.signInWithPassword({ email: nonAdminEmail, password: TEST_PASSWORD });
    const nonAdminToken = nl.session.access_token;

    // ── A. Auth gating ─────────────────────────────────────────────

    console.log('\n  -- A. Auth gating --');

    const r1 = await callEmailSubmit(null, 'getConfig');
    record('A1_unauthenticated_rejected',
      r1.status === 401 || r1.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r1.status}`);

    const r2 = await callEmailSubmit(nonAdminToken, 'getConfig', { system: 'salestrack' });
    record('A2_non_admin_rejected',
      r2.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r2.status}: ${r2.body.error || 'no error'}`);

    // ── B. getConfig with provisioned table ──────────────────────

    console.log('\n  -- B. getConfig with provisioned schema --');

    const r3 = await callEmailSubmit(adminToken, 'getConfig', { system: 'salestrack' });
    record('B1_getConfig_own_system',
      r3.status === 200 ? 'PASS' : 'FAIL',
      `Status ${r3.status}: ${r3.body.error || `smtp_host=${r3.body.smtp_host}`}`);

    const r4 = await callEmailSubmit(adminToken, 'getConfig', { system: 'fleetrack' });
    record('B2_getConfig_other_system_denied',
      r4.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r4.status}: ${r4.body.error || 'no error'}`);

    // ── C. send + cancelScheduled lifecycle ──────────────────────

    console.log('\n  -- C. Send + cancel lifecycle --');

    // Schedule an email far in the future so no worker can send it
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const r5 = await callEmailSubmit(adminToken, 'send', {
      to: 'test-recipient@test.local',
      subject: 'Canary test email',
      html: '<p>Test body</p>',
      system: 'salestrack',
      scheduledFor: futureDate,
    });

    if (r5.status === 200 && r5.body.ok && r5.body.id) {
      scheduledEmailId = r5.body.id;
      record('C1_send_scheduled',
        r5.body.status === 'pending' ? 'PASS' : 'FAIL',
        `id=${scheduledEmailId}, status=${r5.body.status}`);

      // Verify persisted row
      const { data: queueRow } = await serviceClient
        .from('omnis_email_queue')
        .select('id, status, created_by, created_by_id, system, to_email, scheduled_for')
        .eq('id', scheduledEmailId)
        .single();

      record('C2_persisted_row',
        queueRow && queueRow.status === 'pending' && queueRow.created_by_id === adminUser.id ? 'PASS' : 'FAIL',
        queueRow
          ? `status=${queueRow.status}, created_by_id=${queueRow.created_by_id}, system=${queueRow.system}`
          : 'Row not found');

      // Cancel the scheduled email via actual cancelScheduled action
      const r6 = await callEmailSubmit(adminToken, 'cancelScheduled', { id: scheduledEmailId });
      record('C3_cancelScheduled',
        r6.status === 200 && r6.body.ok ? 'PASS' : 'FAIL',
        `Status ${r6.status}: ${r6.body.error || 'ok'}`);

      // Verify cancelled state persisted
      const { data: cancelledRow } = await serviceClient
        .from('omnis_email_queue')
        .select('id, status')
        .eq('id', scheduledEmailId)
        .single();

      record('C4_cancel_persisted',
        cancelledRow && cancelledRow.status === 'cancelled' ? 'PASS' : 'FAIL',
        cancelledRow ? `status=${cancelledRow.status}` : 'Row not found');

      // Double-cancel should fail (status no longer 'pending')
      const r7 = await callEmailSubmit(adminToken, 'cancelScheduled', { id: scheduledEmailId });
      record('C5_double_cancel_rejected',
        r7.status === 400 && r7.body.error && r7.body.error.includes('cancelled') ? 'PASS' : 'FAIL',
        `Status ${r7.status}: ${r7.body.error || 'no error'}`);

    } else {
      record('C1_send_scheduled', 'FAIL',
        `Status ${r5.status}: ${r5.body.error || 'unexpected response'}`);
      record('C2_persisted_row', 'FAIL', 'Skipped — send failed');
      record('C3_cancelScheduled', 'FAIL', 'Skipped — send failed');
      record('C4_cancel_persisted', 'FAIL', 'Skipped — send failed');
      record('C5_double_cancel_rejected', 'FAIL', 'Skipped — send failed');
    }

    // ── D. cancelScheduled edge cases ────────────────────────────

    console.log('\n  -- D. Cancel edge cases --');

    // D1. Cancel nonexistent email
    const r8 = await callEmailSubmit(adminToken, 'cancelScheduled', {
      id: '00000000-0000-0000-0000-000000000000',
    });
    record('D1_cancel_nonexistent',
      r8.status === 404 ? 'PASS' : 'FAIL',
      `Status ${r8.status}: ${r8.body.error || 'no error'}`);

    // D2. Cancel without id
    const r9 = await callEmailSubmit(adminToken, 'cancelScheduled', {});
    record('D2_cancel_no_id',
      r9.status === 400 ? 'PASS' : 'FAIL',
      `Status ${r9.status}: ${r9.body.error || 'no error'}`);

  } catch (e) {
    record('email_submit_integration', 'FAIL', e.message);
  } finally {
    // Cleanup
    if (scheduledEmailId) {
      try { await serviceClient.from('omnis_email_queue').delete().eq('id', scheduledEmailId); } catch (_) {}
    }
    if (adminUser) {
      try { await serviceClient.from('user_system_access').delete().eq('user_id', adminUser.id); } catch (_) {}
      try { await serviceClient.auth.admin.deleteUser(adminUser.id); } catch (_) {}
    }
    if (nonAdminUser) {
      try { await serviceClient.auth.admin.deleteUser(nonAdminUser.id); } catch (_) {}
    }
  }

  console.log('\n=== RESULTS ===');
  let passed = 0, failed = 0;
  RESULTS.forEach(r => { if (r.status === 'PASS') passed++; else failed++; });
  console.log(`Total: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  - ${r.name}: ${r.detail}`));
  }
  return { passed, failed, results: RESULTS };
}

if (require.main === module) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}

module.exports = { runTests };
