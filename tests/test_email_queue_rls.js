/**
 * test_email_queue_rls.js — Data API regression tests for omnis_email_queue RLS
 *
 * PostgREST at localhost:54321 connects to:
 *   postgresql://authenticator:postgres@supabase_db_omnis:5432/postgres
 *
 * Each test uses unique run-owned fixtures (RUN_ID prefix). Cleanup removes
 * only run-owned rows by exact ID. No process.exit() in finally.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const RUN_ID = crypto.randomUUID().slice(0, 8);
const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const results = [];
let createdUserIds = [];
let createdEmailIds = [];

function record(name, pass, detail = '') {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  console.log(`  ${pass ? '✅' : '❌'} [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ': ' + detail : ''}`);
}

function fatal(msg) {
  console.error(`FATAL: ${msg}`);
  process.exitCode = 2;
  throw new Error(msg);
}

// ── Setup helpers ──────────────────────────────────────────────────────

async function createUser(label, systems, isAdmin) {
  const email = `${RUN_ID}-${label}@rls-test.local`;
  const { data, error } = await svc.auth.admin.createUser({
    email, password: 'Pass1234!', email_confirm: true,
  });
  if (error) fatal(`createUser(${label}): ${error.message}`);
  createdUserIds.push(data.user.id);

  const { error: ue } = await svc.from('user_system_access')
    .update({ is_admin: isAdmin, systems })
    .eq('user_id', data.user.id);
  if (ue) fatal(`setupAccess(${label}): ${ue.message}`);

  // Verify
  const { data: access, error: ve } = await svc.from('user_system_access')
    .select('systems, is_admin').eq('user_id', data.user.id).single();
  if (ve) fatal(`verifyAccess(${label}): ${ve.message}`);
  if (JSON.stringify(access.systems) !== JSON.stringify(systems))
    fatal(`verifyAccess(${label}): expected systems=${JSON.stringify(systems)} got ${JSON.stringify(access.systems)}`);
  if (access.is_admin !== isAdmin)
    fatal(`verifyAccess(${label}): expected is_admin=${isAdmin} got ${access.is_admin}`);

  return { id: data.user.id, email };
}

async function loginClient(email) {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: 'Pass1234!' });
  if (error) fatal(`login(${email}): ${error.message}`);
  return c;
}

async function seedEmail(system, toEmail, status = 'pending', extra = {}) {
  const { data, error } = await svc.from('omnis_email_queue').insert({
    to_email: toEmail, subject: `Seed ${RUN_ID}`, body_html: '<p>seed</p>',
    system, created_by: `seed-${RUN_ID}`, status, ...extra,
  }).select().single();
  if (error) fatal(`seedEmail(${system}): ${error.message}`);
  createdEmailIds.push(data.id);
  return data;
}

async function checkPersisted(filter) {
  const { count, error } = await svc.from('omnis_email_queue')
    .select('id', { count: 'exact', head: true }).match(filter);
  if (error) fatal(`checkPersisted: ${error.message}`);
  return count;
}

// ── Cleanup ────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\nCleaning up...');
  for (const id of createdEmailIds) {
    await svc.from('omnis_email_queue').delete().eq('id', id);
  }
  for (const id of createdUserIds) {
    await svc.from('user_system_access').delete().eq('user_id', id);
    await svc.auth.admin.deleteUser(id);
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`DATA API RLS TESTS — run ${RUN_ID}`);
  console.log(`PostgREST: ${SUPABASE_URL} → postgres database`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Setup ──
  console.log('Setting up fixtures...');
  const aliceUser   = await createUser('alice',   ['fleetrack'], false);
  const bobUser     = await createUser('bob',     ['salestrack'], false);
  const eveUser     = await createUser('eve',     ['attacker_sys'], false);
  const charlieUser = await createUser('charlie', ['fleetrack'], false);
  const adminUser   = await createUser('admin',   ['omnis'], true);  // scoped admin: omnis only

  const alice   = await loginClient(aliceUser.email);
  const bob     = await loginClient(bobUser.email);
  const eve     = await loginClient(eveUser.email);
  const charlie = await loginClient(charlieUser.email);
  const adm     = await loginClient(adminUser.email);

  // Seed known rows
  const seedFT   = await seedEmail('fleetrack',  `ft-${RUN_ID}@seed.local`);
  const seedST   = await seedEmail('salestrack', `st-${RUN_ID}@seed.local`);
  const seedOM   = await seedEmail('omnis',      `om-${RUN_ID}@seed.local`);
  const seedFail = await seedEmail('fleetrack', `fail-${RUN_ID}@seed.local`, 'failed',
    { retry_count: 3, error_message: 'SMTP timeout' });

  // ── T1: Cross-system INSERT with RETURNING ──
  console.log('\nT1: Cross-system INSERT (Alice→salestrack)');
  {
    const { data, error } = await alice.from('omnis_email_queue').insert({
      to_email: `t1-${RUN_ID}@test.local`, subject: 'T1', body_html: '<p>t1</p>',
      system: 'salestrack',
    }).select();
    record('T1a: cross-system INSERT denied', error !== null, error?.message);
    const c = await checkPersisted({ to_email: `t1-${RUN_ID}@test.local` });
    record('T1b: nothing persisted', c === 0, `count=${c}`);
  }

  // ── T2: Cross-system INSERT without RETURNING ──
  console.log('\nT2: Cross-system INSERT without RETURNING (Eve→fleetrack)');
  {
    const { error } = await eve.from('omnis_email_queue').insert({
      to_email: `t2-${RUN_ID}@test.local`, subject: 'T2', body_html: '<p>t2</p>',
      system: 'fleetrack',
    });
    record('T2a: cross-system INSERT denied (no returning)', error !== null, error?.message);
    const c = await checkPersisted({ to_email: `t2-${RUN_ID}@test.local` });
    record('T2b: nothing persisted', c === 0, `count=${c}`);
  }

  // ── T3: Same-system INSERT ──
  console.log('\nT3: Same-system INSERT (Alice→fleetrack)');
  {
    const { data, error } = await alice.from('omnis_email_queue').insert({
      to_email: `t3-${RUN_ID}@test.local`, subject: 'T3', body_html: '<p>t3</p>',
      system: 'fleetrack', created_by: aliceUser.email,
    }).select();
    record('T3a: same-system INSERT succeeded', error === null, error?.message);
    record('T3b: returned 1 row', data?.length === 1, `got ${data?.length}`);
    if (data?.[0]) createdEmailIds.push(data[0].id);
  }

  // ── T4: Scoped admin INSERT to UNASSIGNED system — DENIED ──
  console.log('\nT4: Scoped admin INSERT to unassigned system (admin=omnis→salestrack)');
  {
    const { data, error } = await adm.from('omnis_email_queue').insert({
      to_email: `t4-${RUN_ID}@test.local`, subject: 'T4', body_html: '<p>t4</p>',
      system: 'salestrack',  // admin has systems:['omnis'], not salestrack
    }).select();
    record('T4a: scoped admin denied for unassigned system', error !== null, error?.message);
    const c = await checkPersisted({ to_email: `t4-${RUN_ID}@test.local` });
    record('T4b: nothing persisted', c === 0, `count=${c}`);
  }

  // ── T4c: Scoped admin INSERT to ASSIGNED system — ALLOWED ──
  console.log('\nT4c: Scoped admin INSERT to assigned system (admin→omnis)');
  {
    const { data, error } = await adm.from('omnis_email_queue').insert({
      to_email: `t4c-${RUN_ID}@test.local`, subject: 'T4c', body_html: '<p>t4c</p>',
      system: 'omnis',
    }).select();
    record('T4c: scoped admin allowed for assigned system', error === null, error?.message);
    if (data?.[0]) createdEmailIds.push(data[0].id);
  }

  // ── T5: SELECT scope — Alice sees fleetrack only ──
  console.log('\nT5: SELECT scope (Alice)');
  {
    const { data, error } = await alice.from('omnis_email_queue').select('system, to_email')
      .like('to_email', `%${RUN_ID}%`);
    record('T5a: Alice SELECT succeeded', error === null, error?.message);
    const systems = [...new Set(data?.map(r => r.system) || [])];
    record('T5b: Alice sees only fleetrack', systems.length >= 1 && systems.every(s => s === 'fleetrack'),
      `systems: ${JSON.stringify(systems)}`);
    record('T5c: positive results', (data?.length || 0) > 0, `count=${data?.length}`);
  }

  // ── T6: SELECT scope — Bob sees salestrack only ──
  console.log('\nT6: SELECT scope (Bob)');
  {
    const { data, error } = await bob.from('omnis_email_queue').select('system, to_email')
      .like('to_email', `%${RUN_ID}%`);
    record('T6a: Bob SELECT succeeded', error === null, error?.message);
    const systems = [...new Set(data?.map(r => r.system) || [])];
    record('T6b: Bob sees only salestrack', systems.length >= 1 && systems.every(s => s === 'salestrack'),
      `systems: ${JSON.stringify(systems)}`);
    record('T6c: positive results', (data?.length || 0) > 0, `count=${data?.length}`);
  }

  // ── T7: Two users same system ──
  console.log('\nT7: Two users same system (Alice and Charlie, fleetrack)');
  {
    const { data: aData } = await alice.from('omnis_email_queue').select('id').eq('id', seedFT.id);
    const { data: cData } = await charlie.from('omnis_email_queue').select('id').eq('id', seedFT.id);
    record('T7a: Alice sees seeded fleetrack row', aData?.length === 1);
    record('T7b: Charlie sees same row', cData?.length === 1);
  }

  // ── T8: Creator spoofing ──
  console.log('\nT8: Creator identity pinning');
  {
    const { data, error } = await alice.from('omnis_email_queue').insert({
      to_email: `t8-${RUN_ID}@test.local`, subject: 'T8', body_html: '<p>t8</p>',
      system: 'fleetrack', created_by_id: bobUser.id,
    }).select('created_by_id');
    record('T8a: INSERT with spoofed created_by_id succeeded (trigger overrides)', error === null, error?.message);
    if (data?.[0]) {
      createdEmailIds.push(data[0].id);
      record('T8b: created_by_id forced to caller', data[0].created_by_id === aliceUser.id,
        `expected=${aliceUser.id} got=${data[0].created_by_id}`);
    } else {
      record('T8b: created_by_id forced to caller', false, 'no data returned');
    }
  }

  // ── T9: Protected fields on INSERT ──
  console.log('\nT9: Protected fields on INSERT');
  {
    const { data, error } = await alice.from('omnis_email_queue').insert({
      to_email: `t9-${RUN_ID}@test.local`, subject: 'T9', body_html: '<p>t9</p>',
      system: 'fleetrack',
      status: 'sent', sent_at: '2026-01-01T00:00:00Z',
      retry_count: 99, error_message: 'forged', payload_hash: 'fakehash',
    }).select('status, sent_at, retry_count, error_message, payload_hash');
    record('T9a: INSERT succeeded', error === null, error?.message);
    if (data?.[0]) {
      createdEmailIds.push(data[0].id);
      record('T9b: status forced to pending', data[0].status === 'pending', `got ${data[0].status}`);
      record('T9c: sent_at forced to null', data[0].sent_at === null, `got ${data[0].sent_at}`);
      record('T9d: retry_count forced to 0', data[0].retry_count === 0, `got ${data[0].retry_count}`);
      record('T9e: error_message forced to null', data[0].error_message === null, `got ${data[0].error_message}`);
      record('T9f: payload_hash forced to null', data[0].payload_hash === null, `got ${data[0].payload_hash}`);
    } else {
      record('T9b-f: field protection', false, 'no data returned');
    }
  }

  // ── T10: UPDATE — cancel ──
  console.log('\nT10: UPDATE field protection — cancel');
  {
    const { data } = await alice.from('omnis_email_queue')
      .update({ status: 'cancelled' }).eq('id', seedFT.id).select('status');
    record('T10a: cancel pending→cancelled', data?.[0]?.status === 'cancelled');
  }

  // ── T10b: UPDATE — system change blocked ──
  {
    const { data } = await alice.from('omnis_email_queue')
      .update({ system: 'salestrack' }).eq('id', seedFT.id).select('system');
    record('T10b: system change blocked', data?.[0]?.system === 'fleetrack', `got ${data?.[0]?.system}`);
  }

  // ── T10c: UPDATE — sent_at blocked ──
  {
    const { data } = await alice.from('omnis_email_queue')
      .update({ sent_at: '2026-01-01T00:00:00Z' }).eq('id', seedFT.id).select('sent_at');
    record('T10c: sent_at change blocked', data?.[0]?.sent_at === null, `got ${data?.[0]?.sent_at}`);
  }

  // ── T10d: Desktop retry payload — failed→pending with retry_count=0 ──
  console.log('\nT10d: Desktop retry (failed→pending with retry_count reset)');
  {
    // seedFail was seeded with status=failed, retry_count=3, error_message='SMTP timeout'
    const { data } = await alice.from('omnis_email_queue')
      .update({ status: 'pending', retry_count: 0, error_message: null })
      .eq('id', seedFail.id)
      .select('status, retry_count, error_message');
    record('T10d: status→pending', data?.[0]?.status === 'pending', `got ${data?.[0]?.status}`);
    record('T10e: retry_count reset to 0', data?.[0]?.retry_count === 0, `got ${data?.[0]?.retry_count}`);
    record('T10f: error_message cleared', data?.[0]?.error_message === null, `got ${data?.[0]?.error_message}`);
  }

  // ── T10g: Invalid transition blocked ──
  console.log('\nT10g: Invalid transition (cancelled→sent)');
  {
    // seedFT is now cancelled from T10a
    const { data } = await alice.from('omnis_email_queue')
      .update({ status: 'sent' }).eq('id', seedFT.id).select('status');
    record('T10g: invalid transition blocked', data?.[0]?.status === 'cancelled', `got ${data?.[0]?.status}`);
  }

  // ── T11: UPDATE cross-system denied ──
  console.log('\nT11: UPDATE cross-system denied');
  {
    const { data } = await alice.from('omnis_email_queue')
      .update({ status: 'cancelled' }).eq('id', seedST.id).select();
    record('T11: Alice cannot update salestrack row', !data || data.length === 0, `updated=${data?.length}`);
  }

  // ── T12: DELETE denied ──
  console.log('\nT12: DELETE denied');
  {
    await alice.from('omnis_email_queue').delete().eq('id', seedFT.id);
    const c = await checkPersisted({ id: seedFT.id });
    record('T12: row survives DELETE attempt', c === 1, `count=${c}`);
  }

  // ── T13: Anonymous INSERT denied ──
  console.log('\nT13: Anonymous INSERT');
  {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error } = await anon.from('omnis_email_queue').insert({
      to_email: `t13-${RUN_ID}@test.local`, subject: 'T13', body_html: '<p>t13</p>',
      system: 'fleetrack',
    });
    record('T13: anon INSERT denied', error !== null, error?.message);
  }

  // ── T14: Service role full access ──
  console.log('\nT14: Service role full access');
  {
    const { data, error } = await svc.from('omnis_email_queue').select('id')
      .like('to_email', `%${RUN_ID}%`);
    record('T14a: service role SELECT', error === null);
    record('T14b: sees all run-owned rows', (data?.length || 0) >= 4, `count=${data?.length}`);
  }

  // ── T15: Idempotency key duplicate ──
  console.log('\nT15: Idempotency key duplicate');
  {
    const { data: first, error: e1 } = await alice.from('omnis_email_queue').insert({
      to_email: `t15-${RUN_ID}@test.local`, subject: 'T15', body_html: '<p>t15</p>',
      system: 'fleetrack', idempotency_key: `idem-${RUN_ID}`,
    }).select();
    record('T15a: first insert', e1 === null, e1?.message);
    if (first?.[0]) createdEmailIds.push(first[0].id);

    const { error: e2 } = await alice.from('omnis_email_queue').insert({
      to_email: `t15dup-${RUN_ID}@test.local`, subject: 'T15-dup', body_html: '<p>dup</p>',
      system: 'fleetrack', idempotency_key: `idem-${RUN_ID}`,
    }).select();
    record('T15b: duplicate key rejected', e2 !== null, e2?.message);
  }

  // ── T16: Audit trail source pinning ──
  console.log('\nT16: Audit trail source pinning');
  {
    const { data, error } = await alice.from('omnis_audit_trail').insert({
      event_type: 'rls_test', entity_type: 'test',
      user_email: 'spoofed@test.local', source: 'system',
      details: { run: RUN_ID },
    }).select('user_email, source');
    record('T16a: audit INSERT succeeded', error === null, error?.message);
    if (data?.[0]) {
      record('T16b: source forced to client', data[0].source === 'client', `got ${data[0].source}`);
      await svc.from('omnis_audit_trail').delete().eq('id', data[0].id);
    }
  }

  // ── T16d: Backend audit with trusted source ──
  console.log('\nT16d: Backend (service_role) audit receives trusted source');
  {
    const { data, error } = await svc.from('omnis_audit_trail').insert({
      event_type: 'admin_operation', entity_type: 'user',
      user_email: 'admin@test.local', source: 'system',
      details: { run: RUN_ID },
    }).select('user_email, source');
    record('T16d: service_role can set source=system', error === null && data?.[0]?.source === 'system',
      `source=${data?.[0]?.source}`);
    if (data?.[0]) await svc.from('omnis_audit_trail').delete().eq('id', data[0].id);
  }

  // ── T16e: Anonymous audit read ──
  console.log('\nT16e: Anonymous audit read');
  {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await anon.from('omnis_audit_trail').select('id').limit(1);
    // Anon should see audit entries (open SELECT policy by design)
    record('T16e: anon can read audit trail', error === null, error?.message);
  }

  // ── T17: Admin self-modification ──
  console.log('\nT17: Admin and last-admin protection');
  {
    // T17a: admin self-demotion via Data API succeeds when others exist
    // The FOR ALL policy USING(is_admin()) evaluates against the OLD row,
    // so the admin can see and update their own row.
    const { data: upd } = await adm.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', adminUser.id).select('is_admin');
    record('T17a: admin self-demotion succeeds (others exist)',
      upd?.length === 1 && upd[0].is_admin === false, `rows=${upd?.length}`);
    // Verify via service role
    const { data: check } = await svc.from('user_system_access')
      .select('is_admin').eq('user_id', adminUser.id).single();
    record('T17a-verify: admin now demoted', check?.is_admin === false);

    // Restore for remaining tests
    await svc.from('user_system_access').update({ is_admin: true }).eq('user_id', adminUser.id);

    // T17b: Last-admin trigger with EXACTLY ONE admin
    const soleEmail = `${RUN_ID}-sole@rls-test.local`;
    const { data: soleUser } = await svc.auth.admin.createUser({
      email: soleEmail, password: 'Pass1234!', email_confirm: true,
    });
    if (!soleUser?.user) fatal('Could not create sole admin user');
    createdUserIds.push(soleUser.user.id);

    await svc.from('user_system_access')
      .update({ is_admin: true, systems: ['test_system'] })
      .eq('user_id', soleUser.user.id);

    // Demote all other admins one-by-one
    const { data: otherAdmins } = await svc.from('user_system_access')
      .select('user_id').eq('is_admin', true).neq('user_id', soleUser.user.id);
    const savedAdminIds = (otherAdmins || []).map(a => a.user_id);

    for (const id of savedAdminIds) {
      await svc.from('user_system_access').update({ is_admin: false }).eq('user_id', id);
    }

    const { count: admCount } = await svc.from('user_system_access')
      .select('user_id', { count: 'exact', head: true }).eq('is_admin', true);
    record('T17b-setup: exactly one admin remains', admCount === 1, `admin_count=${admCount}`);

    if (admCount === 1) {
      // T17b-update: last admin demotion via UPDATE should fail (trigger)
      const { error: trigErr } = await svc.from('user_system_access')
        .update({ is_admin: false }).eq('user_id', soleUser.user.id);
      record('T17b-update: last admin demotion blocked by trigger', trigErr !== null,
        trigErr?.message || 'no error');

      // T17b-delete: last admin DELETE should fail (trigger)
      const { error: delErr } = await svc.from('user_system_access')
        .delete().eq('user_id', soleUser.user.id);
      record('T17b-delete: last admin DELETE blocked by trigger', delErr !== null,
        delErr?.message || 'no error');

      // T17b-rpc: safe_remove_admin returns {ok:false} (not an exception)
      const { data: rpcResult, error: rpcErr } = await svc.rpc('safe_remove_admin',
        { target_user_id: soleUser.user.id });
      record('T17b-rpc: safe_remove_admin returns ok=false for last admin',
        rpcResult?.ok === false, `ok=${rpcResult?.ok} reason=${rpcResult?.reason}`);

      // Verify admin is still there
      const { data: stillAdmin } = await svc.from('user_system_access')
        .select('is_admin').eq('user_id', soleUser.user.id).single();
      record('T17b-verify: sole admin still active', stillAdmin?.is_admin === true);
    }

    // Restore all other admins
    for (const id of savedAdminIds) {
      await svc.from('user_system_access').update({ is_admin: true }).eq('user_id', id);
    }

    // T17c: Non-admin self-promotion blocked
    const { data: upd17c } = await alice.from('user_system_access')
      .update({ is_admin: true }).eq('user_id', aliceUser.id).select('is_admin');
    const { data: check17c } = await svc.from('user_system_access')
      .select('is_admin').eq('user_id', aliceUser.id).single();
    record('T17c: non-admin self-promotion blocked', check17c?.is_admin === false,
      `is_admin=${check17c?.is_admin}`);

    // Cleanup sole user
    await svc.from('user_system_access').delete().eq('user_id', soleUser.user.id);
    await svc.auth.admin.deleteUser(soleUser.user.id);
    createdUserIds = createdUserIds.filter(id => id !== soleUser.user.id);
  }

  // ── T18: Scoped admin SELECT scope — cannot see other systems ──
  console.log('\nT18: Scoped admin SELECT scope');
  {
    const { data } = await adm.from('omnis_email_queue').select('system, to_email')
      .like('to_email', `%${RUN_ID}%`);
    const systems = [...new Set(data?.map(r => r.system) || [])];
    record('T18a: scoped admin sees only assigned system', systems.every(s => s === 'omnis'),
      `systems: ${JSON.stringify(systems)}`);
    record('T18b: scoped admin has positive results', (data?.length || 0) > 0, `count=${data?.length}`);
  }

  // ── Summary ──
  await cleanup();

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Total: ${total} | Pass: ${pass} | Fail: ${fail} | Spec: 0 | Not Run: 0`);
  console.log(`  Run: ${RUN_ID} | Database: postgres`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  cleanup().catch(() => {});
  process.exitCode = 2;
});
