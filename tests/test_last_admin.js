/**
 * test_last_admin.js — Last-admin invariant and concurrency regression tests.
 *
 * Covers:
 *   T1: Sole active administrator cannot be removed (UPDATE, DELETE, RPC)
 *   T2: Banned administrators do not count as available replacements
 *   T3: Concurrent direct removals cannot leave zero active admins
 *   T4: Direct and RPC operations coordinate correctly
 *   T5: Valid non-last-admin operations still succeed
 *   T6: true→NULL demotion blocked for last admin
 *   T7: user_id reassignment of last admin blocked
 *   T8: Multi-row UPDATE (all admins demoted at once) blocked
 *
 * Uses run-owned fixtures, exact-ID cleanup, and environment guards.
 * Concurrency tests use node-postgres (pg) with separate connections.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');
const crypto = require('crypto');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Direct postgres connection for concurrency tests
const PG_CONNSTR = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const RUN_ID = crypto.randomUUID().slice(0, 8);
const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const results = [];
const createdUserIds = [];

// ── Helpers ────────────────────────────────────────────────────────────

function record(name, pass, detail = '') {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  console.log(`  ${pass ? '✅' : '❌'} [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ': ' + detail : ''}`);
}

function fatal(msg) {
  console.error(`FATAL: ${msg}`);
  process.exitCode = 2;
  throw new Error(msg);
}

async function createTestUser(label, isAdmin = false) {
  const email = `${RUN_ID}-${label}@last-admin-test.local`;
  const { data, error } = await svc.auth.admin.createUser({
    email, password: 'Pass1234!', email_confirm: true,
  });
  if (error) fatal(`createUser(${label}): ${error.message}`);
  const userId = data.user.id;
  createdUserIds.push(userId);

  if (isAdmin) {
    const { error: ue } = await svc.from('user_system_access')
      .update({ is_admin: true, systems: ['test_system'] })
      .eq('user_id', userId);
    if (ue) fatal(`setupAdmin(${label}): ${ue.message}`);
  }

  return { id: userId, email };
}

async function isAdmin(userId) {
  const { data } = await svc.from('user_system_access')
    .select('is_admin').eq('user_id', userId).single();
  return data?.is_admin === true;
}

async function getAdminCount() {
  const { count } = await svc.from('user_system_access')
    .select('user_id', { count: 'exact', head: true }).eq('is_admin', true);
  return count;
}

async function restoreAdmin(userId) {
  await svc.from('user_system_access')
    .update({ is_admin: true }).eq('user_id', userId);
}

// ── Isolation: save and restore other admins ──────────────────────────

let savedOtherAdminIds = [];

async function isolateAdmins(keepIds) {
  const { data } = await svc.from('user_system_access')
    .select('user_id').eq('is_admin', true);
  savedOtherAdminIds = (data || [])
    .map(a => a.user_id)
    .filter(id => !keepIds.includes(id));

  // Demote one-by-one while others still exist
  for (const id of savedOtherAdminIds) {
    const { error } = await svc.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', id);
    if (error) fatal(`isolateAdmins demote ${id}: ${error.message}`);
  }
}

async function restoreOtherAdmins() {
  for (const id of savedOtherAdminIds) {
    await svc.from('user_system_access')
      .update({ is_admin: true }).eq('user_id', id);
  }
  savedOtherAdminIds = [];
}

// ── Cleanup ────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\nCleaning up...');
  await restoreOtherAdmins();
  for (const id of createdUserIds) {
    // Ensure not admin (may need to promote another first to avoid trigger)
    const adminCount = await getAdminCount();
    if (adminCount <= 1) {
      const { data: admCheck } = await svc.from('user_system_access')
        .select('is_admin').eq('user_id', id).single();
      if (admCheck?.is_admin) {
        // Can't delete last admin; create a temporary one
        const { data: tmp } = await svc.auth.admin.createUser({
          email: `${RUN_ID}-tmp-cleanup@last-admin-test.local`,
          password: 'Pass1234!', email_confirm: true,
        });
        if (tmp?.user) {
          await svc.from('user_system_access')
            .update({ is_admin: true }).eq('user_id', tmp.user.id);
          await svc.from('user_system_access')
            .update({ is_admin: false }).eq('user_id', id);
          await svc.from('user_system_access').delete().eq('user_id', id);
          await svc.auth.admin.deleteUser(id);
          await svc.from('user_system_access')
            .update({ is_admin: false }).eq('user_id', tmp.user.id);
          await svc.from('user_system_access').delete().eq('user_id', tmp.user.id);
          await svc.auth.admin.deleteUser(tmp.user.id);
          continue;
        }
      }
    }
    await svc.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', id);
    await svc.from('user_system_access').delete().eq('user_id', id);
    await svc.auth.admin.deleteUser(id);
  }
}

// ── Environment guard ──────────────────────────────────────────────────

async function verifyEnvironment() {
  const { data, error } = await svc.from('user_system_access').select('user_id').limit(1);
  if (error) fatal(`Environment check failed: ${error.message}`);

  // Verify we're talking to the expected PostgREST
  const pg = new PgClient(PG_CONNSTR);
  try {
    await pg.connect();
    const res = await pg.query("SELECT current_database() AS db");
    const db = res.rows[0].db;
    if (db !== 'postgres') fatal(`Unexpected database: ${db}`);
  } finally {
    await pg.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`LAST-ADMIN INVARIANT TESTS — run ${RUN_ID}`);
  console.log(`PostgREST: ${SUPABASE_URL} | Direct: ${PG_CONNSTR}`);
  console.log(`${'═'.repeat(60)}\n`);

  await verifyEnvironment();

  // ── T1: Sole active admin cannot be removed ────────────────────────

  console.log('T1: Sole active admin cannot be removed');
  {
    const admin = await createTestUser('sole', true);
    await isolateAdmins([admin.id]);

    const count = await getAdminCount();
    record('T1-setup: exactly one admin', count === 1, `count=${count}`);

    // T1a: UPDATE demotion
    const { error: updErr } = await svc.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', admin.id);
    record('T1a: UPDATE demotion blocked', updErr !== null, updErr?.message);

    // T1b: DELETE
    const { error: delErr } = await svc.from('user_system_access')
      .delete().eq('user_id', admin.id);
    record('T1b: DELETE blocked', delErr !== null, delErr?.message);

    // T1c: RPC safe_remove_admin
    const { data: rpc } = await svc.rpc('safe_remove_admin',
      { target_user_id: admin.id });
    record('T1c: safe_remove_admin returns ok=false',
      rpc?.ok === false, `ok=${rpc?.ok} reason=${rpc?.reason}`);

    // T1d: verify still admin
    record('T1d: admin still active', await isAdmin(admin.id));

    await restoreOtherAdmins();
  }

  // ── T2: Banned admins don't count as replacements ──────────────────

  console.log('\nT2: Banned admins do not count as replacements');
  {
    const real = await createTestUser('real-admin', true);
    const banned = await createTestUser('banned-admin', true);
    await isolateAdmins([real.id, banned.id]);

    // Ban the second admin via Auth
    const { error: banErr } = await svc.auth.admin.updateUserById(
      banned.id, { ban_duration: '876000h' }); // ~100 years
    if (banErr) fatal(`Ban failed: ${banErr.message}`);

    // Now only 'real' is a non-banned admin
    // Try to demote real — should fail (banned doesn't count)
    const { error: updErr } = await svc.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', real.id);
    record('T2a: demotion blocked (banned admin not counted)', updErr !== null,
      updErr?.message);
    record('T2b: real admin still active', await isAdmin(real.id));

    // Unban and clean up
    await svc.auth.admin.updateUserById(banned.id, { ban_duration: 'none' });
    await restoreOtherAdmins();
  }

  // ── T3a: Concurrent UPDATE demotions ────────────────────────────────

  console.log('\nT3a: Concurrent UPDATE demotions');
  {
    const a3a1 = await createTestUser('conc-upd-1', true);
    const a3a2 = await createTestUser('conc-upd-2', true);
    await isolateAdmins([a3a1.id, a3a2.id]);

    const count = await getAdminCount();
    record('T3a-setup: exactly two admins', count === 2, `count=${count}`);

    const pg1 = new PgClient(PG_CONNSTR);
    const pg2 = new PgClient(PG_CONNSTR);
    await pg1.connect();
    await pg2.connect();

    try {
      const p1 = pg1.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [a3a1.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const p2 = pg2.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [a3a2.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const [r1, r2] = await Promise.all([p1, p2]);

      const total = await getAdminCount();
      const loser = [r1, r2].find(r => !r.ok);
      const loserCode = loser?.err?.code || 'none';
      const loserIsDeadlock = loserCode === '40P01';
      const loserIsInvariant = loserCode === 'P0001';

      record('T3a: at least one admin remains', total >= 1, `admins=${total}`);
      record('T3a-reject: loser received deadlock or invariant error',
        loserIsDeadlock || loserIsInvariant,
        `code=${loserCode} msg=${loser?.err?.message?.slice(0, 60)}`);
    } finally {
      await pg1.end();
      await pg2.end();
    }
    await restoreOtherAdmins();
  }

  // ── T3b: Concurrent DELETE attempts ────────────────────────────────

  console.log('\nT3b: Concurrent DELETE attempts');
  {
    const a3b1 = await createTestUser('conc-del-1', true);
    const a3b2 = await createTestUser('conc-del-2', true);
    await isolateAdmins([a3b1.id, a3b2.id]);

    const count = await getAdminCount();
    record('T3b-setup: exactly two admins', count === 2, `count=${count}`);

    const pg3 = new PgClient(PG_CONNSTR);
    const pg4 = new PgClient(PG_CONNSTR);
    await pg3.connect();
    await pg4.connect();

    try {
      const d1 = pg3.query(
        `DELETE FROM user_system_access WHERE user_id = $1`, [a3b1.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const d2 = pg4.query(
        `DELETE FROM user_system_access WHERE user_id = $1`, [a3b2.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const [dr1, dr2] = await Promise.all([d1, d2]);
      const total = await getAdminCount();
      const loser = [dr1, dr2].find(r => !r.ok);
      const loserCode = loser?.err?.code || 'none';

      record('T3b: at least one admin remains after concurrent deletes',
        total >= 1, `admins=${total} d1=${dr1.ok} d2=${dr2.ok}`);
      record('T3b-reject: loser error code',
        loserCode === '40P01' || loserCode === 'P0001',
        `code=${loserCode}`);
    } finally {
      await pg3.end();
      await pg4.end();
    }
    await restoreOtherAdmins();
  }

  // ── T3c: Mixed UPDATE/DELETE (independent fixtures) ────────────────

  console.log('\nT3c: Mixed UPDATE/DELETE');
  {
    const a3c1 = await createTestUser('conc-mix-1', true);
    const a3c2 = await createTestUser('conc-mix-2', true);
    await isolateAdmins([a3c1.id, a3c2.id]);

    const count = await getAdminCount();
    record('T3c-setup: exactly two admins', count === 2, `count=${count}`);

    const pg5 = new PgClient(PG_CONNSTR);
    const pg6 = new PgClient(PG_CONNSTR);
    await pg5.connect();
    await pg6.connect();

    try {
      const m1 = pg5.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [a3c1.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const m2 = pg6.query(
        `DELETE FROM user_system_access WHERE user_id = $1`, [a3c2.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const [mr1, mr2] = await Promise.all([m1, m2]);
      const total = await getAdminCount();
      const loser = [mr1, mr2].find(r => !r.ok);
      const loserCode = loser?.err?.code || 'none';

      record('T3c: at least one admin remains after mixed UPDATE/DELETE',
        total >= 1, `admins=${total} upd=${mr1.ok} del=${mr2.ok}`);
      record('T3c-reject: loser error code',
        loserCode === '40P01' || loserCode === 'P0001',
        `code=${loserCode}`);
    } finally {
      await pg5.end();
      await pg6.end();
    }
    await restoreOtherAdmins();
  }

  // ── T4: Direct and RPC coordinate ──────────────────────────────────

  console.log('\nT4: Direct and RPC operations coordinate correctly');
  {
    const adminX = await createTestUser('coord-x', true);
    const adminY = await createTestUser('coord-y', true);
    await isolateAdmins([adminX.id, adminY.id]);

    const pg7 = new PgClient(PG_CONNSTR);
    await pg7.connect();

    try {
      const directP = pg7.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [adminX.id]
      ).then(() => ({ ok: true })).catch(err => ({ ok: false, msg: err.message }));

      const rpcP = svc.rpc('safe_remove_admin', { target_user_id: adminY.id });

      const [directR, { data: rpcR }] = await Promise.all([directP, rpcP]);

      const totalAfter = await getAdminCount();
      record('T4a: at least one admin remains after direct+RPC',
        totalAfter >= 1,
        `admins=${totalAfter} direct=${directR.ok} rpc=${JSON.stringify(rpcR)}`);

    } finally {
      await pg7.end();
    }
    await restoreOtherAdmins();
  }

  // ── T5: Valid non-last-admin operations succeed ─────────────────────

  console.log('\nT5: Valid non-last-admin operations succeed');
  {
    const keeper = await createTestUser('keeper', true);
    const removable = await createTestUser('removable', true);

    const { error: dErr } = await svc.from('user_system_access')
      .update({ is_admin: false }).eq('user_id', removable.id);
    record('T5a: demotion succeeds when others exist', dErr === null, dErr?.message);
    record('T5b: demoted user is no longer admin', !(await isAdmin(removable.id)));

    await restoreAdmin(removable.id);
    const { error: delErr } = await svc.from('user_system_access')
      .delete().eq('user_id', removable.id);
    record('T5c: DELETE succeeds when others exist', delErr === null, delErr?.message);

    const removable2 = await createTestUser('removable2', true);
    const { data: rpc5 } = await svc.rpc('safe_remove_admin',
      { target_user_id: removable2.id });
    record('T5d: safe_remove_admin succeeds for non-last', rpc5?.ok === true,
      `ok=${rpc5?.ok}`);
  }

  // ── T6: true→NULL demotion blocked for last admin ──────────────────

  console.log('\nT6: true→NULL demotion blocked');
  {
    const sole6 = await createTestUser('sole6', true);
    await isolateAdmins([sole6.id]);

    const pg8 = new PgClient(PG_CONNSTR);
    await pg8.connect();
    try {
      let err6 = null;
      try {
        await pg8.query(
          `UPDATE user_system_access SET is_admin = NULL WHERE user_id = $1`,
          [sole6.id]
        );
      } catch (e) { err6 = e; }
      record('T6a: true→NULL blocked for last admin', err6 !== null, err6?.message);
      record('T6b: admin still active', await isAdmin(sole6.id));
    } finally {
      await pg8.end();
    }
    await restoreOtherAdmins();
  }

  // ── T7: user_id reassignment of last admin blocked ─────────────────

  console.log('\nT7: user_id reassignment of last admin blocked');
  {
    const sole7 = await createTestUser('sole7', true);
    const nobody = await createTestUser('nobody7', false);
    await isolateAdmins([sole7.id]);

    const pg9 = new PgClient(PG_CONNSTR);
    await pg9.connect();
    try {
      let err7 = null;
      try {
        await pg9.query(
          `UPDATE user_system_access SET user_id = $1 WHERE user_id = $2`,
          [nobody.id, sole7.id]
        );
      } catch (e) { err7 = e; }
      record('T7a: user_id reassignment blocked for last admin',
        err7 !== null, err7?.message);
      record('T7b: original admin still active', await isAdmin(sole7.id));
    } finally {
      await pg9.end();
    }
    await restoreOtherAdmins();
  }

  // ── T8: Multi-row UPDATE blocked ───────────────────────────────────

  console.log('\nT8: Multi-row UPDATE of all admins blocked');
  {
    const multi1 = await createTestUser('multi1', true);
    const multi2 = await createTestUser('multi2', true);
    await isolateAdmins([multi1.id, multi2.id]);

    const pg10 = new PgClient(PG_CONNSTR);
    await pg10.connect();
    try {
      let err8 = null;
      try {
        await pg10.query(
          `UPDATE user_system_access SET is_admin = false WHERE user_id IN ($1, $2)`,
          [multi1.id, multi2.id]
        );
      } catch (e) { err8 = e; }

      const totalAfter8 = await getAdminCount();
      record('T8a: multi-row demotion raised error', err8 !== null, err8?.message);
      record('T8b: at least one admin remains', totalAfter8 >= 1, `count=${totalAfter8}`);
    } finally {
      await pg10.end();
    }
    await restoreOtherAdmins();
  }

  // ── T9: Deadlock handling verification ─────────────────────────────
  // Verifies that SQLSTATE 40P01 (deadlock_detected) produces:
  //   - No false success from the rolled-back connection
  //   - A clear error (not an uncaught crash)
  //   - No state corruption (exactly one admin demoted)

  console.log('\nT9: Deadlock handling verification');
  {
    const d1 = await createTestUser('dl-1', true);
    const d2 = await createTestUser('dl-2', true);
    await isolateAdmins([d1.id, d2.id]);

    const pgA = new PgClient(PG_CONNSTR);
    const pgB = new PgClient(PG_CONNSTR);
    await pgA.connect();
    await pgB.connect();

    try {
      const rA = pgA.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [d1.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const rB = pgB.query(
        `UPDATE user_system_access SET is_admin = false WHERE user_id = $1`,
        [d2.id]
      ).then(() => ({ ok: true, err: null }))
       .catch(err => ({ ok: false, err }));

      const [resA, resB] = await Promise.all([rA, rB]);

      // Exactly one should succeed, one should fail
      const winner = resA.ok ? resA : resB;
      const loser = resA.ok ? resB : resA;

      record('T9a: exactly one operation succeeded',
        (resA.ok !== resB.ok), `A=${resA.ok} B=${resB.ok}`);

      record('T9b: loser received clear error (no false success)',
        loser.err !== null && loser.err !== undefined,
        `code=${loser.err?.code} msg=${loser.err?.message?.slice(0, 60)}`);

      record('T9c: loser error is deadlock (40P01) or invariant (P0001)',
        loser.err?.code === '40P01' || loser.err?.code === 'P0001',
        `code=${loser.err?.code}`);

      // The failed connection's transaction was rolled back — verify
      // by checking that the loser's target admin was NOT demoted
      const d1Admin = await isAdmin(d1.id);
      const d2Admin = await isAdmin(d2.id);
      const totalAdmins = await getAdminCount();

      record('T9d: exactly one admin remains (no compensation needed)',
        totalAdmins === 1, `admins=${totalAdmins} d1=${d1Admin} d2=${d2Admin}`);

      record('T9e: winner target was demoted', !winner.ok || totalAdmins === 1);

      // Verify the losing connection is usable for new queries
      // (not in a broken state)
      const loserPg = resA.ok ? pgB : pgA;
      let queryAfterFail = null;
      try {
        const r = await loserPg.query('SELECT 1 AS ok');
        queryAfterFail = r.rows[0].ok;
      } catch (e) {
        queryAfterFail = `error: ${e.message}`;
      }
      record('T9f: loser connection is reusable after rollback',
        queryAfterFail === 1, `result=${queryAfterFail}`);

    } finally {
      await pgA.end();
      await pgB.end();
    }
    await restoreOtherAdmins();
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
  console.error(`\nFATAL: ${err.message}\n${err.stack}`);
  cleanup().catch(() => {});
  process.exitCode = 2;
});
