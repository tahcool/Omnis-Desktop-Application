/**
 * test_email.js — Email Service Endpoint Tests
 * 
 * Tests email-submit Edge Function covering:
 * - Authentication (missing/invalid JWT)
 * - Authorization (admin vs ordinary user)
 * - Company-scoped submission and history
 * - SMTP config access control
 * - Cancellation/retry ownership
 * - Idempotency (duplicate + conflict)
 * - Queue durability
 * - Credential exclusion from responses
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

async function setAccess(userId, isAdmin, systems) {
  const { error } = await serviceClient
    .from('user_system_access')
    .upsert({ user_id: userId, is_admin: isAdmin, systems }, { onConflict: 'user_id' });
  if (error) throw new Error(`setAccess: ${error.message}`);
}

async function loginUser(email, password = 'Test1234!') {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login(${email}): ${error.message}`);
  return { client, session: data.session, user: data.user };
}

async function callEmailSubmit(token, action, params = {}) {
  const resp = await fetch(`${FUNCTIONS_URL}/email-submit`, {
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

async function testEmailAuth() {
  console.log('\n-- Email Auth Tests --');

  // Missing token
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/email-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ action: 'send', to: 'x@x.com', subject: 'test', html: '<p>t</p>' }),
    });
    const body = await resp.json();
    record('email_jwt_missing', resp.status === 401 ? 'PASS' : 'FAIL',
      `Status ${resp.status}: ${body.error || 'no error'}`);
  } catch (e) { record('email_jwt_missing', 'FAIL', e.message); }

  // Invalid token
  try {
    const r = await callEmailSubmit('not-valid', 'send', { to: 'x@x.com', subject: 'test', html: '<p>t</p>' });
    record('email_jwt_invalid', r.status === 401 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'no error'}`);
  } catch (e) { record('email_jwt_invalid', 'FAIL', e.message); }
}

async function testEmailPermissions() {
  console.log('\n-- Email Permission Tests --');
  
  const ts = Date.now();
  const ordUser = await createTestUser(`email-ord-${ts}@test.local`);
  await setAccess(ordUser.id, false, ['salestrack']);
  const { session: ordSession } = await loginUser(`email-ord-${ts}@test.local`);
  const ordToken = ordSession.access_token;

  const adminUser = await createTestUser(`email-adm-${ts}@test.local`);
  await setAccess(adminUser.id, true, ['salestrack', 'fleetrack']);
  const { session: admSession } = await loginUser(`email-adm-${ts}@test.local`);
  const admToken = admSession.access_token;

  // Ordinary user CAN submit in own system
  try {
    const r = await callEmailSubmit(ordToken, 'send', {
      to: 'test@example.com', subject: 'Test', html: '<p>Hello</p>', system: 'salestrack',
    });
    record('email_ord_own_system', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'id=' + r.body.id}`);
  } catch (e) { record('email_ord_own_system', 'FAIL', e.message); }

  // Ordinary user DENIED in foreign system
  try {
    const r = await callEmailSubmit(ordToken, 'send', {
      to: 'test@example.com', subject: 'Test', html: '<p>Hello</p>', system: 'fleetrack',
    });
    record('email_ord_foreign_system', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected success'}`);
  } catch (e) { record('email_ord_foreign_system', 'FAIL', e.message); }

  // Admin CAN submit in any system
  try {
    const r = await callEmailSubmit(admToken, 'send', {
      to: 'admin-test@example.com', subject: 'Admin Test', html: '<p>Admin</p>', system: 'fleetrack',
    });
    record('email_admin_any_system', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'id=' + r.body.id}`);
  } catch (e) { record('email_admin_any_system', 'FAIL', e.message); }

  // getConfig denied for non-admin
  try {
    const r = await callEmailSubmit(ordToken, 'getConfig', { system: 'fleetrack' });
    record('email_config_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected access'}`);
  } catch (e) { record('email_config_denied', 'FAIL', e.message); }

  // getConfig succeeds for admin, password MASKED
  try {
    const r = await callEmailSubmit(admToken, 'getConfig', { system: 'fleetrack' });
    const hasMasked = r.body.smtp_pass && r.body.smtp_pass.includes('•');
    const noRealPass = !r.body.smtp_pass || !r.body.smtp_pass.includes('test-pass');
    record('email_config_admin_masked', r.status === 200 && hasMasked && noRealPass ? 'PASS' : 'FAIL',
      `Status ${r.status}, masked=${hasMasked}, no_real_pass=${noRealPass}`);
  } catch (e) { record('email_config_admin_masked', 'FAIL', e.message); }

  // saveConfig denied for non-admin
  try {
    const r = await callEmailSubmit(ordToken, 'saveConfig', { host: 'evil.com' });
    record('email_saveconfig_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('email_saveconfig_denied', 'FAIL', e.message); }

  // retryFailed denied for non-admin
  try {
    const r = await callEmailSubmit(ordToken, 'retryFailed', { id: '00000000-0000-0000-0000-000000000000' });
    record('email_retry_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('email_retry_denied', 'FAIL', e.message); }

  // test action denied for non-admin
  try {
    const r = await callEmailSubmit(ordToken, 'test', {});
    record('email_test_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('email_test_denied', 'FAIL', e.message); }

  await deleteTestUser(ordUser.id);
  await deleteTestUser(adminUser.id);
}

async function testEmailHistory() {
  console.log('\n-- Email History Scope Tests --');

  const ts = Date.now();
  const userA = await createTestUser(`hist-a-${ts}@test.local`);
  await setAccess(userA.id, false, ['salestrack']);
  const { session: sessA } = await loginUser(`hist-a-${ts}@test.local`);

  const userB = await createTestUser(`hist-b-${ts}@test.local`);
  await setAccess(userB.id, false, ['salestrack']);
  const { session: sessB } = await loginUser(`hist-b-${ts}@test.local`);

  const adminUser = await createTestUser(`hist-adm-${ts}@test.local`);
  await setAccess(adminUser.id, true, ['salestrack']);
  const { session: admSess } = await loginUser(`hist-adm-${ts}@test.local`);

  // User A submits an email
  await callEmailSubmit(sessA.access_token, 'send', {
    to: 'hist@test.com', subject: 'From A', html: '<p>A</p>', system: 'salestrack',
  });

  // User B submits an email
  await callEmailSubmit(sessB.access_token, 'send', {
    to: 'hist@test.com', subject: 'From B', html: '<p>B</p>', system: 'salestrack',
  });

  // User A's getHistory should only show their own
  try {
    const r = await callEmailSubmit(sessA.access_token, 'getHistory', {});
    const ownOnly = r.body.data && r.body.data.every(e => 
      e.created_by === `hist-a-${ts}@test.local`
    );
    record('email_history_own_only', ownOnly ? 'PASS' : 'FAIL',
      `Found ${r.body.data?.length || 0} emails, all own: ${ownOnly}`);
  } catch (e) { record('email_history_own_only', 'FAIL', e.message); }

  // Admin sees all
  try {
    const r = await callEmailSubmit(admSess.access_token, 'getHistory', {});
    const hasMultiple = r.body.data && r.body.data.length >= 2;
    record('email_history_admin_all', hasMultiple ? 'PASS' : 'FAIL',
      `Admin sees ${r.body.data?.length || 0} emails (need ≥2)`);
  } catch (e) { record('email_history_admin_all', 'FAIL', e.message); }

  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
  await deleteTestUser(adminUser.id);
}

async function testEmailCancellation() {
  console.log('\n-- Email Cancellation Ownership Tests --');

  const ts = Date.now();
  const userA = await createTestUser(`cancel-a-${ts}@test.local`);
  await setAccess(userA.id, false, ['salestrack']);
  const { session: sessA } = await loginUser(`cancel-a-${ts}@test.local`);

  const userB = await createTestUser(`cancel-b-${ts}@test.local`);
  await setAccess(userB.id, false, ['salestrack']);
  const { session: sessB } = await loginUser(`cancel-b-${ts}@test.local`);

  const admin = await createTestUser(`cancel-adm-${ts}@test.local`);
  await setAccess(admin.id, true, ['salestrack']);
  const { session: admSess } = await loginUser(`cancel-adm-${ts}@test.local`);

  // A submits email
  const r1 = await callEmailSubmit(sessA.access_token, 'send', {
    to: 'x@x.com', subject: 'Cancel Test', html: '<p>X</p>', system: 'salestrack',
  });
  const emailId = r1.body.id;

  // B cannot cancel A's email
  try {
    const r = await callEmailSubmit(sessB.access_token, 'cancelScheduled', { id: emailId });
    record('email_cancel_nonowner_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected'}`);
  } catch (e) { record('email_cancel_nonowner_denied', 'FAIL', e.message); }

  // A can cancel own email
  try {
    // Submit another email for A to cancel
    const r2 = await callEmailSubmit(sessA.access_token, 'send', {
      to: 'x@x.com', subject: 'My Email', html: '<p>X</p>', system: 'salestrack',
    });
    const r = await callEmailSubmit(sessA.access_token, 'cancelScheduled', { id: r2.body.id });
    record('email_cancel_owner', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'ok'}`);
  } catch (e) { record('email_cancel_owner', 'FAIL', e.message); }

  // Admin can cancel anyone's email
  try {
    const r = await callEmailSubmit(admSess.access_token, 'cancelScheduled', { id: emailId });
    record('email_cancel_admin', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'ok'}`);
  } catch (e) { record('email_cancel_admin', 'FAIL', e.message); }

  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
  await deleteTestUser(admin.id);
}

async function testEmailIdempotency() {
  console.log('\n-- Email Idempotency Tests --');

  const ts = Date.now();
  const user = await createTestUser(`idem-${ts}@test.local`);
  await setAccess(user.id, false, ['salestrack']);
  const { session } = await loginUser(`idem-${ts}@test.local`);
  const token = session.access_token;
  const idemKey = `test-idem-${ts}`;

  // First submission
  let firstId;
  try {
    const r = await callEmailSubmit(token, 'send', {
      to: 'idem@test.com', subject: 'First', html: '<p>First</p>',
      system: 'salestrack', idempotencyKey: idemKey,
    });
    firstId = r.body.id;
    record('email_idem_first', r.status === 200 && r.body.ok && !r.body.duplicate ? 'PASS' : 'FAIL',
      `Status ${r.status}, id=${firstId}, duplicate=${r.body.duplicate}`);
  } catch (e) { record('email_idem_first', 'FAIL', e.message); }

  // Duplicate (same key, same payload) returns original ID
  try {
    const r = await callEmailSubmit(token, 'send', {
      to: 'idem@test.com', subject: 'First', html: '<p>First</p>',
      system: 'salestrack', idempotencyKey: idemKey,
    });
    record('email_idem_duplicate', r.body.id === firstId && r.body.duplicate === true ? 'PASS' : 'FAIL',
      `Same ID: ${r.body.id === firstId}, duplicate flag: ${r.body.duplicate}`);
  } catch (e) { record('email_idem_duplicate', 'FAIL', e.message); }

  // Same key, different payload — current behavior returns original (should ideally conflict)
  // Test documents the actual behavior
  try {
    const r = await callEmailSubmit(token, 'send', {
      to: 'different@test.com', subject: 'DIFFERENT PAYLOAD', html: '<p>Different</p>',
      system: 'salestrack', idempotencyKey: idemKey,
    });
    // Document: returns original, does NOT detect payload conflict
    const returnsOriginal = r.body.id === firstId && r.body.duplicate === true;
    const conflicts = r.status === 409;
    record('email_idem_diff_payload',
      conflicts ? 'PASS' : (returnsOriginal ? 'FAIL' : 'FAIL'),
      conflicts ? 'Correctly conflicts on different payload' :
      returnsOriginal ? 'DEFECT: Returns original ID without detecting payload mismatch' :
      `Unexpected: status=${r.status}, id=${r.body.id}`);
  } catch (e) { record('email_idem_diff_payload', 'FAIL', e.message); }

  // Concurrent duplicate submissions
  try {
    const key2 = `conc-${ts}`;
    const promises = Array.from({ length: 5 }, (_, i) =>
      callEmailSubmit(token, 'send', {
        to: `conc${i}@test.com`, subject: 'Concurrent', html: '<p>C</p>',
        system: 'salestrack', idempotencyKey: key2,
      })
    );
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled' && r.value.body.ok);
    const uniqueIds = new Set(successes.map(r => r.value.body.id));
    record('email_idem_concurrent', uniqueIds.size === 1 ? 'PASS' : 'FAIL',
      `${successes.length} successes, ${uniqueIds.size} unique IDs (should be 1)`);
  } catch (e) { record('email_idem_concurrent', 'FAIL', e.message); }

  await deleteTestUser(user.id);
}

async function testEmailDurability() {
  console.log('\n-- Email Queue Durability --');

  const ts = Date.now();
  const user = await createTestUser(`durable-${ts}@test.local`);
  await setAccess(user.id, false, ['salestrack']);
  const { session } = await loginUser(`durable-${ts}@test.local`);
  const token = session.access_token;

  // Submit email — verify it persists as 'pending' without worker
  try {
    const r = await callEmailSubmit(token, 'send', {
      to: 'durable@test.com', subject: 'Durable', html: '<p>D</p>',
      system: 'salestrack', scheduledFor: new Date(Date.now() + 86400000).toISOString(),
    });
    // Check directly in DB
    const { data: row } = await serviceClient
      .from('omnis_email_queue')
      .select('status')
      .eq('id', r.body.id)
      .single();
    record('email_queue_durable', row && row.status === 'pending' ? 'PASS' : 'FAIL',
      `Queued id=${r.body.id}, status=${row?.status || 'not found'}`);
  } catch (e) { record('email_queue_durable', 'FAIL', e.message); }

  // Response never contains SMTP credentials
  try {
    const r = await callEmailSubmit(token, 'send', {
      to: 'check@test.com', subject: 'Cred Check', html: '<p>C</p>', system: 'salestrack',
    });
    const bodyStr = JSON.stringify(r.body);
    const hasSmtp = bodyStr.includes('smtp_pass') || bodyStr.includes('test-pass');
    record('email_no_smtp_in_response', !hasSmtp ? 'PASS' : 'FAIL',
      `SMTP creds in response: ${hasSmtp}`);
  } catch (e) { record('email_no_smtp_in_response', 'FAIL', e.message); }

  await deleteTestUser(user.id);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('============================================================');
  console.log('Email Service Test Suite');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  // Pre-flight
  try {
    const { error } = await serviceClient.from('omnis_email_queue').select('id', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Pre-flight: omnis_email_queue accessible\n');
  } catch (e) {
    console.error(`Pre-flight: omnis_email_queue not accessible: ${e.message}`);
    console.error('Run: docker exec supabase_db_omnis psql -U postgres -f /dev/stdin < tests/fixtures.sql');
    process.exit(1);
  }

  // Check Edge Functions
  let efAvailable = false;
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/email-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ action: 'ping' }),
    });
    efAvailable = resp.status !== 502 && resp.status !== 0;
    console.log(`Edge Functions: ${efAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} (status: ${resp.status})\n`);
  } catch (e) {
    console.log(`Edge Functions: UNAVAILABLE (${e.message})\n`);
  }

  if (!efAvailable) {
    console.error('Edge Functions not available. Start with: supabase functions serve');
    process.exit(1);
  }

  await testEmailAuth();
  await testEmailPermissions();
  await testEmailHistory();
  await testEmailCancellation();
  await testEmailIdempotency();
  await testEmailDurability();

  // Summary
  console.log('\n============================================================');
  console.log('EMAIL TEST RESULTS');
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
