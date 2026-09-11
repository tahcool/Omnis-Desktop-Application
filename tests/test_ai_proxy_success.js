/**
 * test_ai_proxy_success.js — AI Proxy success-path tests with mock provider.
 *
 * Starts a local HTTP server that mimics OpenAI's chat completions API,
 * then calls ai-proxy through its real implementation to verify successful
 * responses reach the client response contract.
 *
 * Requires:
 *   - Supabase running locally (supabase start)
 *   - Edge Functions served with mock env:
 *       supabase functions serve --no-verify-jwt \
 *         --env-file ./tests/.env.ai-mock
 *   - tests/.env.ai-mock must contain:
 *       OPENAI_API_KEY=sk-mock-test-key-not-real
 *       OPENAI_BASE_URL=http://host.docker.internal:<MOCK_PORT>
 *   - tests/fixtures.sql applied
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/test_ai_proxy_success.js
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const mock = require('./mock_openai');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_o0BopYoAhfVB78Yc2BMF-4kICDXXk-2nQ';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const MOCK_PORT = parseInt(process.env.MOCK_PORT || '9876');

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

// ── Test Helpers ─────────────────────────────────────────────────────

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
    { email: 'ai_success_admin@test.local', password: 'Test1234!', is_admin: true, systems: ['fleetrack', 'salestrack'] },
    { email: 'ai_success_user@test.local', password: 'Test1234!', is_admin: false, systems: ['fleetrack'] },
  ];
  for (const u of users) {
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
    await sb.from('user_system_access').upsert({
      user_id: userId, is_admin: u.is_admin, systems: u.systems,
    }, { onConflict: 'user_id' });
  }
}

// ── Test Runner ──────────────────────────────────────────────────────

(async () => {
  console.log('============================================================');
  console.log('AI Proxy SUCCESS-PATH Test Suite (Mock Provider)');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Mock Port: ${MOCK_PORT}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  // Start mock server
  const mockServer = await mock.start(MOCK_PORT);

  try {
    // Pre-flight: verify ai-proxy is accessible
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
      console.log('Ensure: supabase functions serve --no-verify-jwt --env-file ./tests/.env.ai-mock');
      process.exit(1);
    }

    await ensureTestUsers();
    const adminToken = await getToken('ai_success_admin@test.local', 'Test1234!');
    const userToken = await getToken('ai_success_user@test.local', 'Test1234!');

    // ── Success-Path Tests ──────────────────────────────────────────

    console.log('\n-- Success-Path Tests (Mock Provider) --');

    // 1. magic_fill — success response with structured JSON
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'magic_fill',
        text: 'Quote for 2 CAT D6 bulldozers for Test Corp, lead time 4 weeks, price 150k each',
      });

      const hasResult = data.ok === true && data.action === 'magic_fill' && data.result;
      const result = data.result || {};
      const hasExpectedFields = result.customer && result.item_code && typeof result.price === 'number';

      record('ai_success_magic_fill', status === 200 && hasResult && hasExpectedFields ? 'PASS' : 'FAIL',
        `Status: ${status}, ok: ${data.ok}, customer: ${result.customer}, ` +
        `item: ${result.item_code}, price: ${result.price}`);
    } catch (e) { record('ai_success_magic_fill', 'FAIL', e.message); }

    // 2. smart_title — success response
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'smart_title',
        customer: 'Mining Corp Ltd',
        item: 'Komatsu PC200 Excavator',
      });

      const hasResult = data.ok === true && data.action === 'smart_title' && data.result;
      const result = data.result || {};
      const hasTitle = typeof result.title === 'string' && result.title.length > 0;

      record('ai_success_smart_title', status === 200 && hasResult && hasTitle ? 'PASS' : 'FAIL',
        `Status: ${status}, ok: ${data.ok}, title: ${result.title}`);
    } catch (e) { record('ai_success_smart_title', 'FAIL', e.message); }

    // 3. quotation_intelligence — success response with all contract fields
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'quotation_intelligence',
        customer: 'Acme Mining',
        item: 'CAT 320 Excavator',
        price: 280000,
      });

      const hasResult = data.ok === true && data.action === 'quotation_intelligence' && data.result;
      const result = data.result || {};
      const hasInsights = typeof result.insights === 'string';
      const hasTips = Array.isArray(result.negotiationTips);

      record('ai_success_quotation_intel', status === 200 && hasResult && hasInsights && hasTips ? 'PASS' : 'FAIL',
        `Status: ${status}, ok: ${data.ok}, insights: ${(result.insights || '').substring(0, 60)}, ` +
        `tips: ${(result.negotiationTips || []).length}`);
    } catch (e) { record('ai_success_quotation_intel', 'FAIL', e.message); }

    // 4. order_intelligence — success response
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'order_intelligence',
        context: 'Q3 2026: 45 orders, $12.5M total value, excavators 60%, bulldozers 25%',
      });

      const hasResult = data.ok === true && data.action === 'order_intelligence' && data.result;
      const result = data.result || {};
      const hasInsights = typeof result.insights === 'string';
      const hasRecs = Array.isArray(result.recommendations);

      record('ai_success_order_intel', status === 200 && hasResult && hasInsights && hasRecs ? 'PASS' : 'FAIL',
        `Status: ${status}, ok: ${data.ok}, insights: ${(result.insights || '').substring(0, 60)}, ` +
        `recommendations: ${(result.recommendations || []).length}`);
    } catch (e) { record('ai_success_order_intel', 'FAIL', e.message); }

    // 5. test_connection (admin-only) — success response
    try {
      const { status, data } = await callProxy(adminToken, {
        action: 'test_connection',
      });

      const hasResult = data.ok === true && data.action === 'test_connection' && data.result;
      const result = data.result || {};
      const connectionOk = result.ok === true && typeof result.message === 'string';

      record('ai_success_test_connection', status === 200 && hasResult && connectionOk ? 'PASS' : 'FAIL',
        `Status: ${status}, ok: ${data.ok}, result.ok: ${result.ok}, message: ${result.message}`);
    } catch (e) { record('ai_success_test_connection', 'FAIL', e.message); }

    // ── Authorization boundary (non-admin cannot use admin-only action) ──

    console.log('\n-- Authorization Boundary --');

    try {
      const { status, data } = await callProxy(userToken, { action: 'test_connection' });
      record('ai_success_admin_boundary', status === 403 ? 'PASS' : 'FAIL',
        `Status: ${status} (expect 403): ${data.error}`);
    } catch (e) { record('ai_success_admin_boundary', 'FAIL', e.message); }

    // ── Response contract validation ──

    console.log('\n-- Response Contract --');

    // 7. Verify response structure: { ok: true, action: string, result: object }
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'magic_fill', text: 'test contract check',
      });

      const hasOk = typeof data.ok === 'boolean';
      const hasAction = typeof data.action === 'string';
      const hasResult = data.result !== undefined && data.result !== null;
      const noError = !data.error;
      const allFields = hasOk && hasAction && hasResult && noError;

      record('ai_success_response_contract', status === 200 && allFields ? 'PASS' : 'FAIL',
        `ok:${hasOk}, action:${hasAction}, result:${hasResult}, no-error:${noError}`);
    } catch (e) { record('ai_success_response_contract', 'FAIL', e.message); }

    // 8. Verify no credentials leak in success response
    try {
      const { status, data } = await callProxy(userToken, {
        action: 'magic_fill', text: 'credential check',
      });
      const body = JSON.stringify(data);
      const hasCreds = body.includes('sk-mock') || body.includes('sk-') ||
                       body.includes('Bearer ') || body.includes('smtp_pass');
      record('ai_success_no_creds_leak', !hasCreds ? 'PASS' : 'FAIL',
        `Credentials in success response: ${hasCreds}`);
    } catch (e) { record('ai_success_no_creds_leak', 'FAIL', e.message); }

  } finally {
    // Shutdown mock server
    await mock.stop(mockServer);
  }

  // ── Summary ──
  console.log('\n============================================================');
  console.log('AI PROXY SUCCESS-PATH TEST RESULTS');
  console.log('============================================================');
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`  Total: ${results.length} | Pass: ${pass} | Fail: ${fail}`);

  if (fail > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  }

  process.exit(fail > 0 ? 1 : 0);
})();
