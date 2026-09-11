/**
 * test_returning_atomicity.js — INSERT RETURNING atomicity reproduction.
 *
 * Tests the actual scenario: INSERT policy PERMITS the row, but there is
 * no SELECT policy permitting the caller to read it back.
 *
 * Creates an isolated test table with:
 *   - INSERT WITH CHECK (true) — any authenticated user can insert
 *   - SELECT USING (false)     — no authenticated user can read
 *   - No DELETE policy         — rows persist
 *
 * Tests:
 *   A1: INSERT ... RETURNING (via .select()) — should fail, no committed row
 *   A2: INSERT without RETURNING             — should succeed, row committed
 *   A3: INSERT ... RETURNING on permitted table — should succeed (control case)
 *
 * Uses unique IDs, independent service_role verification, and exit codes.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');
const crypto = require('crypto');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const PG_CONNSTR = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const RUN_ID = crypto.randomUUID().slice(0, 8);
const TABLE_NAME = `_test_atomicity_${RUN_ID.replace(/-/g, '_')}`;
const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  console.log(`  ${pass ? '✅' : '❌'} [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ': ' + detail : ''}`);
}

function fatal(msg) {
  console.error(`FATAL: ${msg}`);
  process.exitCode = 2;
  throw new Error(msg);
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`INSERT RETURNING ATOMICITY TESTS — run ${RUN_ID}`);
  console.log(`${'═'.repeat(60)}\n`);

  const pg = new PgClient(PG_CONNSTR);
  await pg.connect();

  // ── Setup: Create isolated test table ──────────────────────────────
  console.log('Setting up isolated test table...');
  try {
    await pg.query(`
      CREATE TABLE public.${TABLE_NAME} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.${TABLE_NAME} ENABLE ROW LEVEL SECURITY;

      -- INSERT policy: any authenticated user can insert
      CREATE POLICY insert_allowed ON public.${TABLE_NAME}
        FOR INSERT TO authenticated
        WITH CHECK (true);

      -- SELECT policy: NO authenticated user can read (the key scenario)
      -- Intentionally omitted — default deny means SELECT is denied.
      -- This creates the exact scenario: INSERT permitted, SELECT denied.

      -- Grant basic table access to authenticated role
      GRANT INSERT, SELECT ON public.${TABLE_NAME} TO authenticated;
      GRANT ALL ON public.${TABLE_NAME} TO service_role;

      -- Expose via PostgREST
      NOTIFY pgrst, 'reload schema';
    `);
  } catch (e) {
    fatal(`Table creation failed: ${e.message}`);
  }

  // Wait for PostgREST schema reload
  await new Promise(r => setTimeout(r, 1000));

  // Create test user
  const email = `${RUN_ID}-atomicity@test.local`;
  const { data: userData, error: userErr } = await svc.auth.admin.createUser({
    email, password: 'Pass1234!', email_confirm: true,
  });
  if (userErr) fatal(`User creation failed: ${userErr.message}`);
  const userId = userData.user.id;

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: loginErr } = await client.auth.signInWithPassword({ email, password: 'Pass1234!' });
  if (loginErr) fatal(`Login failed: ${loginErr.message}`);

  // ── A1: INSERT with RETURNING (.select()) — should fail ────────────
  console.log('\nA1: INSERT with RETURNING to insert-only table');
  {
    const label = `a1-${RUN_ID}`;
    const { data, error, status } = await client.from(TABLE_NAME).insert({
      label,
    }).select();

    record('A1a: API returns error (cannot read back)',
      error !== null, `status=${status} error=${error?.message}`);

    // Check committed state via trusted connection
    const check = await pg.query(
      `SELECT count(*) AS c FROM public.${TABLE_NAME} WHERE label = $1`,
      [label]
    );
    const persisted = parseInt(check.rows[0].c);
    record('A1b: row NOT committed (INSERT rolled back with RETURNING failure)',
      persisted === 0, `persisted=${persisted}`);
  }

  // ── A2: INSERT without RETURNING — should succeed ──────────────────
  console.log('\nA2: INSERT without RETURNING to insert-only table');
  {
    const label = `a2-${RUN_ID}`;
    const { data, error, status } = await client.from(TABLE_NAME).insert({
      label,
    });

    record('A2a: API returns success (no RETURNING needed)',
      error === null, `status=${status} error=${error?.message}`);

    // Check committed state
    const check = await pg.query(
      `SELECT count(*) AS c FROM public.${TABLE_NAME} WHERE label = $1`,
      [label]
    );
    const persisted = parseInt(check.rows[0].c);
    record('A2b: row IS committed (INSERT without RETURNING succeeds)',
      persisted === 1, `persisted=${persisted}`);
  }

  // ── A3: Control — INSERT with RETURNING on readable table ──────────
  console.log('\nA3: Control — INSERT with RETURNING on readable table');
  {
    // omnis_email_queue has matching INSERT and SELECT policies
    const toEmail = `${RUN_ID}-a3@atomicity.local`;

    // First ensure user has system access
    await svc.from('user_system_access')
      .update({ systems: ['fleetrack'] }).eq('user_id', userId);

    const { data, error } = await client.from('omnis_email_queue').insert({
      to_email: toEmail, subject: 'A3', body_html: '<p>a3</p>',
      system: 'fleetrack',
    }).select();

    record('A3a: INSERT with RETURNING succeeds on readable table',
      error === null && data?.length === 1,
      `status=${error ? 'error' : 'ok'} rows=${data?.length}`);

    // Cleanup
    if (data?.[0]) {
      await svc.from('omnis_email_queue').delete().eq('id', data[0].id);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────
  console.log('\nCleaning up...');
  await pg.query(`DROP TABLE IF EXISTS public.${TABLE_NAME}`);
  await pg.query(`NOTIFY pgrst, 'reload schema'`);
  await svc.from('user_system_access').delete().eq('user_id', userId);
  await svc.auth.admin.deleteUser(userId);
  await pg.end();

  // ── Summary ────────────────────────────────────────────────────────
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
  process.exitCode = 2;
});
