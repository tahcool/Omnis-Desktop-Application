/**
 * test_company_isolation.js — Company Boundary Tests
 *
 * Seeds two companies with representative users and tests:
 * - Business data isolation (email queue, user_system_access)
 * - Company-scoped vs global administrator authority
 * - Multi-company user access
 * - Cross-company operation denial
 * - Email submission and history scoping
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

// ── Helpers ──────────────────────────────────────────────────────────

async function createTestUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: 'Test1234!', email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

async function deleteTestUser(userId) {
  await admin.from('user_system_access').delete().eq('user_id', userId);
  await admin.from('omnis_email_queue').delete().eq('created_by', userId);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function setAccess(userId, isAdmin, systems) {
  await admin.from('user_system_access')
    .upsert({ user_id: userId, is_admin: isAdmin, systems }, { onConflict: 'user_id' });
}

async function loginAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'Test1234!' });
  if (error) throw new Error(`login(${email}): ${error.message}`);
  return { client, token: data.session.access_token, user: data.user };
}

async function callEF(funcName, token, body) {
  const resp = await fetch(`${FUNCTIONS_URL}/${funcName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return { status: resp.status, body: await resp.json() };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('============================================================');
  console.log('Company Isolation Test Suite');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('============================================================');

  const ts = Date.now();

  // ── Seed Users ──
  // Company A: ordinary user + company admin
  const userA = await createTestUser(`co-a-user-${ts}@test.local`);
  await setAccess(userA.id, false, ['company_a']);

  const adminA = await createTestUser(`co-a-admin-${ts}@test.local`);
  await setAccess(adminA.id, true, ['company_a']);

  // Company B: ordinary user
  const userB = await createTestUser(`co-b-user-${ts}@test.local`);
  await setAccess(userB.id, false, ['company_b']);

  // Dual-company user (assigned to both A and B)
  const dualUser = await createTestUser(`co-dual-${ts}@test.local`);
  await setAccess(dualUser.id, false, ['company_a', 'company_b']);

  // Login all
  const sessA = await loginAs(`co-a-user-${ts}@test.local`);
  const sessAdmA = await loginAs(`co-a-admin-${ts}@test.local`);
  const sessB = await loginAs(`co-b-user-${ts}@test.local`);
  const sessDual = await loginAs(`co-dual-${ts}@test.local`);

  // ── Email Submission Scoping ──
  console.log('\n-- Email Company Scope Tests --');

  // User A can submit in company_a system
  try {
    const r = await callEF('email-submit', sessA.token, {
      action: 'send', to: 'test@co-a.com', subject: 'From A', html: '<p>A</p>', system: 'company_a',
    });
    record('email_compA_submit', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'ok'}`);
  } catch (e) { record('email_compA_submit', 'FAIL', e.message); }

  // User A DENIED in company_b system
  try {
    const r = await callEF('email-submit', sessA.token, {
      action: 'send', to: 'test@co-b.com', subject: 'Cross', html: '<p>X</p>', system: 'company_b',
    });
    record('email_cross_company_denied', r.status === 403 ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'unexpected success'}`);
  } catch (e) { record('email_cross_company_denied', 'FAIL', e.message); }

  // User B submits in company_b
  try {
    const r = await callEF('email-submit', sessB.token, {
      action: 'send', to: 'test@co-b.com', subject: 'From B', html: '<p>B</p>', system: 'company_b',
    });
    record('email_compB_submit', r.status === 200 && r.body.ok ? 'PASS' : 'FAIL',
      `Status ${r.status}: ${r.body.error || 'ok'}`);
  } catch (e) { record('email_compB_submit', 'FAIL', e.message); }

  // Dual user can submit in either system
  try {
    const rA = await callEF('email-submit', sessDual.token, {
      action: 'send', to: 'dual@test.com', subject: 'Dual A', html: '<p>DA</p>', system: 'company_a',
    });
    const rB = await callEF('email-submit', sessDual.token, {
      action: 'send', to: 'dual@test.com', subject: 'Dual B', html: '<p>DB</p>', system: 'company_b',
    });
    record('email_dual_user_both', 
      rA.status === 200 && rB.status === 200 ? 'PASS' : 'FAIL',
      `A: ${rA.status}, B: ${rB.status}`);
  } catch (e) { record('email_dual_user_both', 'FAIL', e.message); }

  // ── Email History Isolation ──
  console.log('\n-- Email History Isolation --');

  // User A sees only their own emails
  try {
    const r = await callEF('email-submit', sessA.token, { action: 'getHistory' });
    const ownOnly = r.body.data && r.body.data.every(e =>
      e.created_by === `co-a-user-${ts}@test.local`
    );
    record('email_hist_a_own', ownOnly ? 'PASS' : 'FAIL',
      `User A sees ${r.body.data?.length || 0} emails, all own: ${ownOnly}`);
  } catch (e) { record('email_hist_a_own', 'FAIL', e.message); }

  // User B sees only their own emails
  try {
    const r = await callEF('email-submit', sessB.token, { action: 'getHistory' });
    const ownOnly = r.body.data && r.body.data.every(e =>
      e.created_by === `co-b-user-${ts}@test.local`
    );
    record('email_hist_b_own', ownOnly ? 'PASS' : 'FAIL',
      `User B sees ${r.body.data?.length || 0} emails, all own: ${ownOnly}`);
  } catch (e) { record('email_hist_b_own', 'FAIL', e.message); }

  // Company admin A sees only company_a emails (system-scoped, not global)
  try {
    const r = await callEF('email-submit', sessAdmA.token, { action: 'getHistory' });
    const onlyCompanyA = r.body.data && r.body.data.every(e => e.system === 'company_a');
    const noCrossCompany = r.body.data && !r.body.data.some(e => e.system === 'company_b');
    record('email_hist_admin_scope',
      onlyCompanyA && noCrossCompany ? 'PASS' : 'FAIL',
      `Admin A sees ${r.body.data?.length || 0} emails, all company_a: ${onlyCompanyA}, no company_b: ${noCrossCompany}`);
  } catch (e) { record('email_hist_admin_scope', 'FAIL', e.message); }

  // ── RLS Direct Database Tests ──
  console.log('\n-- Direct Database RLS Tests --');

  // User A reads user_system_access: sees only own row
  try {
    const { data, error } = await sessA.client.from('user_system_access').select('*');
    const ownOnly = data && data.every(r => r.user_id === userA.id);
    record('rls_usa_own_only', ownOnly ? 'PASS' : 'FAIL',
      `User A sees ${data?.length || 0} rows, all own: ${ownOnly}`);
  } catch (e) { record('rls_usa_own_only', 'FAIL', e.message); }

  // User A cannot read User B's access
  try {
    const { data } = await sessA.client.from('user_system_access')
      .select('*').eq('user_id', userB.id);
    record('rls_cross_company_read', data?.length === 0 ? 'PASS' : 'FAIL',
      `User A seeing B's rows: ${data?.length || 0} (should be 0)`);
  } catch (e) { record('rls_cross_company_read', 'FAIL', e.message); }

  // Dual user sees only own row
  try {
    const { data } = await sessDual.client.from('user_system_access').select('*');
    const ownOnly = data && data.every(r => r.user_id === dualUser.id);
    record('rls_dual_own_only', ownOnly ? 'PASS' : 'FAIL',
      `Dual user sees ${data?.length || 0} rows, all own: ${ownOnly}`);
  } catch (e) { record('rls_dual_own_only', 'FAIL', e.message); }

  // Anonymous cannot read any business data
  try {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anonClient.from('user_system_access').select('*');
    record('rls_anon_blocked', !data || data.length === 0 ? 'PASS' : 'FAIL',
      `Anon rows: ${data?.length || 0} (should be 0)`);
  } catch (e) { record('rls_anon_blocked', 'FAIL', e.message); }

  // ── Admin Operations — Company vs Global Scope ──
  console.log('\n-- Admin Operations Scope Tests --');

  // Company admin A cannot modify User B (cross-company) via admin-operations
  // The admin-operations checkCompanyScope function should enforce this
  try {
    const r = await callEF('admin-operations', sessAdmA.token, {
      action: 'suspendUser', userId: userB.id,
    });
    // Either 403 (scope denied) or implementation allows (document which)
    const denied = r.status === 403;
    record('admin_cross_company_suspend',
      denied ? 'PASS' : 'FAIL',
      denied ? `Correctly denied cross-company suspend: ${r.body.error}` :
      `Status ${r.status}: ${r.body.error || 'allowed cross-company'}`);
  } catch (e) { record('admin_cross_company_suspend', 'FAIL', e.message); }

  // Dual user cannot self-promote to admin via direct DB
  try {
    const { error } = await sessDual.client.from('user_system_access')
      .update({ is_admin: true }).eq('user_id', dualUser.id);
    // RLS should prevent this — either error or silently no-op
    const { data: check } = await admin.from('user_system_access')
      .select('is_admin').eq('user_id', dualUser.id).single();
    record('dual_self_promote', check?.is_admin === false ? 'PASS' : 'FAIL',
      `is_admin after attempt: ${check?.is_admin} (should be false)`);
  } catch (e) { record('dual_self_promote', 'FAIL', e.message); }

  // ── Cleanup ──
  console.log('\n-- Cleanup --');
  for (const u of [userA, adminA, userB, dualUser]) {
    await deleteTestUser(u.id);
  }
  // Clean test emails
  await admin.from('omnis_email_queue')
    .delete().like('to_email', '%test.com').like('created_by', `%${ts}%`);
  console.log('  Cleanup complete');

  // ── Summary ──
  console.log('\n============================================================');
  console.log('COMPANY ISOLATION RESULTS');
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
