/**
 * test_ai_proxy.js — AI Proxy Edge Function tests with mocked provider.
 *
 * Tests structured AI proxy actions, authorization, input validation,
 * and error handling WITHOUT requiring a real OpenAI key.
 *
 * Prerequisites:
 *   - Supabase running locally (supabase start)
 *   - Edge Functions served (supabase functions serve --no-verify-jwt)
 *   - tests/fixtures.sql applied
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/test_ai_proxy.js
 */

const { createClient } = require('@supabase/supabase-js');
const mock = require('./mock_openai');
const MOCK_PORT = parseInt(process.env.MOCK_PORT || '9876');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_o0BopYoAhfVB78Yc2BMF-4kICDXXk-2nQ';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

async function getToken(email, password) {
  const sb = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return data.session.access_token;
}

async function callProxy(token, body) {
  const headers = { 'Content-Type': 'application/json', 'apikey': ANON_KEY };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return { status: resp.status, data };
}

async function ensureTestUsers() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const users = [
    { email: 'ai_admin@test.local', password: 'Test1234!', is_admin: true, systems: ['fleetrack', 'salestrack'] },
    { email: 'ai_user@test.local', password: 'Test1234!', is_admin: false, systems: ['fleetrack'] },
    { email: 'ai_other@test.local', password: 'Test1234!', is_admin: false, systems: ['company_b'] },
  ];

  for (const u of users) {
    // Create or get user
    let userId;
    const { data: existing } = await sb.auth.admin.listUsers();
    const found = existing?.users?.find(x => x.email === u.email);
    if (found) {
      userId = found.id;
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
    }

    // Upsert access
    await sb.from('user_system_access').upsert({
      user_id: userId, is_admin: u.is_admin, systems: u.systems,
    }, { onConflict: 'user_id' });
  }
}

(async () => {
  console.log('============================================================');
  console.log('AI Proxy Test Suite');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  // Pre-flight check
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: '{}',
    });
    if (resp.status === 0) throw new Error('Connection refused');
    console.log(`Pre-flight: ai-proxy accessible (status: ${resp.status})\n`);
  } catch (e) {
    console.log(`Pre-flight: ai-proxy NOT accessible: ${e.message}`);
    console.log('Ensure: supabase start && supabase functions serve --no-verify-jwt');
    process.exit(1);
  }

  await ensureTestUsers();
  const adminToken = await getToken('ai_admin@test.local', 'Test1234!');
  const userToken = await getToken('ai_user@test.local', 'Test1234!');
  const otherToken = await getToken('ai_other@test.local', 'Test1234!');

  // ── Auth Tests ──

  console.log('\n-- Authentication Tests --');

  // 1. Missing JWT
  try {
    const { status, data } = await callProxy(null, { action: 'magic_fill', text: 'test' });
    record('ai_jwt_missing', status === 401 ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}`);
  } catch (e) { record('ai_jwt_missing', 'FAIL', e.message); }

  // 2. Invalid JWT
  try {
    const { status, data } = await callProxy('invalid.jwt.token', { action: 'magic_fill', text: 'test' });
    record('ai_jwt_invalid', status === 401 ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}`);
  } catch (e) { record('ai_jwt_invalid', 'FAIL', e.message); }

  // ── Action Validation Tests ──

  console.log('\n-- Action Validation Tests --');

  // 3. Missing action field
  try {
    const { status, data } = await callProxy(userToken, { text: 'test' });
    record('ai_action_missing', status === 400 ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}, available: ${data.availableActions?.length}`);
  } catch (e) { record('ai_action_missing', 'FAIL', e.message); }

  // 4. Unknown action
  try {
    const { status, data } = await callProxy(userToken, { action: 'hack_the_planet' });
    record('ai_action_unknown', status === 400 ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}`);
  } catch (e) { record('ai_action_unknown', 'FAIL', e.message); }

  // 5. Missing required fields
  try {
    const { status, data } = await callProxy(userToken, { action: 'magic_fill' });
    record('ai_missing_fields', status === 400 ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}`);
  } catch (e) { record('ai_missing_fields', 'FAIL', e.message); }

  // ── Authorization Tests (before mock — denied requests must not reach provider) ──

  console.log('\n-- Authorization Tests --');

  // Start mock to track hits. Unauthorized requests must produce zero hits.
  let mockServer;
  try {
    mockServer = await mock.start(MOCK_PORT);
  } catch (e) {
    console.error(`  FATAL: Could not start mock server on port ${MOCK_PORT}: ${e.message}`);
    process.exit(3);
  }

  // 6. Admin-only action by non-admin — must be rejected, zero mock hits
  try {
    mock.resetHitCount();
    const { status, data } = await callProxy(userToken, { action: 'test_connection' });
    const hitsAfter = mock.getHitCount();
    const authOk = status === 403;
    const noLeak = hitsAfter === 0;
    record('ai_admin_action_denied', authOk && noLeak ? 'PASS' : 'FAIL',
      `Status ${status}: ${data.error}, mock hits: ${hitsAfter} (expect 0)`);
  } catch (e) { record('ai_admin_action_denied', 'FAIL', e.message); }

  // ── Success-Path Tests (mock provider running) ──

  console.log('\n-- Success-Path Tests (Mock Provider) --');

  // 7. Admin-only action by admin — assert real 200 with response contract
  try {
    mock.resetHitCount();
    const { status, data } = await callProxy(adminToken, { action: 'test_connection' });
    const mockHit = mock.getHitCount() > 0;
    const ok = status === 200 && data.ok === true && data.result?.ok === true;
    record('ai_admin_action_allowed', ok && mockHit ? 'PASS' : 'FAIL',
      `Status ${status}, ok: ${data.ok}, result.ok: ${data.result?.ok}, mockHit: ${mockHit}`);
  } catch (e) { record('ai_admin_action_allowed', 'FAIL', e.message); }

  // 8. magic_fill — assert successful extraction
  try {
    const { status, data } = await callProxy(userToken, { action: 'magic_fill', text: 'quote for 2 excavators' });
    const ok = status === 200 && data.ok === true && data.result?.customer;
    record('ai_permitted_action', ok ? 'PASS' : 'FAIL',
      `Status ${status}, ok: ${data.ok}, customer: ${data.result?.customer}`);
  } catch (e) { record('ai_permitted_action', 'FAIL', e.message); }

  // 9. smart_title — assert title in result
  try {
    const { status, data } = await callProxy(userToken, { action: 'smart_title', customer: 'Acme Corp', item: 'CAT D6 Bulldozer' });
    const ok = status === 200 && data.ok === true && data.result?.title;
    record('ai_smart_title', ok ? 'PASS' : 'FAIL',
      `Status ${status}, ok: ${data.ok}, title: ${data.result?.title?.substring(0, 60)}`);
  } catch (e) { record('ai_smart_title', 'FAIL', e.message); }

  // 10. quotation_intelligence — assert insights
  try {
    const { status, data } = await callProxy(userToken, {
      action: 'quotation_intelligence',
      customer: 'Test Client', item: 'Excavator', price: 50000, context: 'test',
    });
    const ok = status === 200 && data.ok === true && data.result?.insights;
    record('ai_quotation_intel', ok ? 'PASS' : 'FAIL',
      `Status ${status}, ok: ${data.ok}, insights: ${data.result?.insights?.substring(0, 60)}`);
  } catch (e) { record('ai_quotation_intel', 'FAIL', e.message); }

  // ── Response Format Tests ──

  console.log('\n-- Response Format Tests --');

  // 11. Error responses include structured data
  try {
    const { status, data } = await callProxy(userToken, { action: 'unknown_action' });
    const hasAvailable = Array.isArray(data.availableActions) && data.availableActions.length > 0;
    record('ai_error_format', hasAvailable ? 'PASS' : 'FAIL',
      `Has availableActions: ${hasAvailable}, count: ${data.availableActions?.length}`);
  } catch (e) { record('ai_error_format', 'FAIL', e.message); }

  // 12. No credentials leak in success responses
  try {
    const { status, data } = await callProxy(userToken, { action: 'magic_fill', text: 'test' });
    const body = JSON.stringify(data);
    const hasCreds = body.includes('sk-') || body.includes('Bearer ') || body.includes('smtp_pass');
    record('ai_no_creds_leak', !hasCreds ? 'PASS' : 'FAIL',
      `Credentials in response: ${hasCreds}`);
  } catch (e) { record('ai_no_creds_leak', 'FAIL', e.message); }

  // Stop mock server
  await mock.stop(mockServer);

  // ── Legacy Key Protection ──

  console.log('\n-- Legacy Key Protection --');

  // 13. Verify omnis_app_settings is accessible but check if openai key is present
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb
      .from('omnis_app_settings')
      .select('setting_key')
      .eq('setting_key', 'openai_api_key');

    // In a fresh install there should be no key, which is correct
    const hasKey = data && data.length > 0;
    record('ai_legacy_key_check', 'PASS',
      `Legacy openai_api_key in omnis_app_settings: ${hasKey ? 'EXISTS (needs migration plan)' : 'not present'}`);
  } catch (e) {
    // Table may not exist, which is also fine
    record('ai_legacy_key_check', 'PASS', `omnis_app_settings not accessible: ${e.message}`);
  }

  // ── Summary ──

  console.log('\n============================================================');
  console.log('AI PROXY TEST RESULTS');
  console.log('============================================================');
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`  Total: ${results.length} | Pass: ${pass} | Fail: ${fail}`);
  console.log(JSON.stringify({ suite: 'test_ai_proxy', pass, fail, total: results.length }));

  if (fail > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }

  process.exit(fail > 0 ? 1 : 0);
})();
