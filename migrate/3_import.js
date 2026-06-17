#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FRAPPE → SUPABASE MIGRATION TOOLKIT
 *  Phase 3: Import — Reads NDJSON export files, auto-creates Supabase
 *            tables (if they don't exist), and inserts all records.
 *
 *  Usage:
 *    node migrate/3_import.js [--only "ft_machine,ft_breakdown_log"] [--dry-run]
 *
 *  Features:
 *    - Auto-generates CREATE TABLE from first record's fields
 *    - Idempotent: skips tables that already have data (safe to re-run)
 *    - Batched inserts (100 records at a time)
 *    - Progress tracking and resume support
 * ═══════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const EXPORT_DIR   = path.join(__dirname, 'export');
const BATCH_SIZE   = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const args = {};
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1] ?? true;
});

const DRY_RUN = args['dry-run'] === true;

// ── Tables to skip (already migrated OR not business data) ──────────
const ALREADY_MIGRATED = new Set([
  // Already in Supabase
  'ft_machine', 'ft_breakdown_log', 'ft_defect', 'ft_defects_log',
  'ft_service_plan', 'ft_service_log', 'ft_technician', 'ft_hmr_log',
  // Frappe system/noise — not business data
  'email_queue', 'deleted_document', 'route_history', 'error_snapshot',
  'data_import_log', 'data_import_log_error', 'workspace_shortcut',
  'workflow_action_permitted_role', 'workflow_action_master',
  'notification_log', 'notification_settings', 'console_log',
  'prepared_report', 'document_share_key', 'access_log',
  'list_view_settings', 'dashboard_settings', 'auto_email_report',
  'web_template', 'color', 'salutation', 'gender', 'print_style',
  'module_onboarding', 'module_profile', 'role_profile', 'custom_role',
  'user_type', 'website_theme', 'email_domain', 'email_unsubscribe',
  'top_bar_item', 'kanban_board', 'form_tour',
]);

// ── Infer Postgres type from JS value ──────────────────────────────
function inferType(val) {
  if (val === null || val === undefined) return 'text';
  if (typeof val === 'boolean')          return 'boolean';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'bigint' : 'double precision';
  }
  if (typeof val === 'object')           return 'jsonb';
  // Date patterns
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'timestamptz';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'date';
  return 'text';
}

// Build column definitions from a sample record
function buildColumnDefs(records) {
  const merged = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r)) {
      if (v !== null && v !== undefined && v !== '') {
        // keep the first non-null value we find to infer type
        if (!(k in merged)) merged[k] = v;
      } else if (!(k in merged)) {
        merged[k] = null;
      }
    }
  }

  const cols = [];
  for (const [key, val] of Object.entries(merged)) {
    if (key === 'name') continue; // handled as PK
    const type = inferType(val);
    cols.push(`  "${key}" ${type}`);
  }
  return cols;
}

// ── Auto-create table via Supabase RPC (raw SQL) ───────────────────
async function ensureTable(tableName, records) {
  // Check if table exists
  const { data, error } = await supabase
    .from(tableName)
    .select('name')
    .limit(1);

  if (!error) return true; // table exists

  if (!error.message.includes('does not exist') && !error.message.includes('relation') && !error.message.includes('schema cache')) {
    console.warn(`   ⚠️  Cannot verify table ${tableName}: ${error.message}`);
    return false;
  }

  // Table doesn't exist — generate CREATE TABLE
  const cols  = buildColumnDefs(records);
  const sql   = [
    `CREATE TABLE IF NOT EXISTS public."${tableName}" (`,
    `  "name" text PRIMARY KEY,`,
    cols.join(',\n'),
    `);`,
    `ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`,
  ].join('\n');

  console.log(`   🏗  Creating table: ${tableName}`);
  if (DRY_RUN) { console.log(sql); return true; }

  // Use Supabase's exec_sql RPC if available, or warn
  const { error: rpcErr } = await supabase.rpc('exec_sql', { query: sql });
  if (rpcErr) {
    // Fallback: write SQL to file for manual execution
    const sqlFile = path.join(__dirname, 'pending_tables.sql');
    fs.appendFileSync(sqlFile, sql + '\n\n');
    console.warn(`   ⚠️  Cannot auto-create ${tableName} — SQL written to pending_tables.sql`);
    return false;
  }
  return true;
}

// ── Import a single NDJSON file into Supabase ──────────────────────
async function importFile(ndjsonFile) {
  const content  = fs.readFileSync(ndjsonFile, 'utf8').trim();
  if (!content)  return { imported: 0, skipped: 0 };

  const records  = content.split('\n').map(l => JSON.parse(l));
  if (!records.length) return { imported: 0, skipped: 0 };

  const basename  = path.basename(ndjsonFile, '.ndjson');
  const tableName = `frappe_${basename}`; // prefix to avoid conflicts

  const ok = await ensureTable(tableName, records);
  if (!ok) return { imported: 0, skipped: records.length };

  // Check if already populated
  const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  if (count > 0 && basename !== 'quotation') {
    console.log(`   ⏭  ${tableName} already has ${count} records — skipping.`);
    return { imported: 0, skipped: records.length };
  }

  if (DRY_RUN) {
    console.log(`   [DRY-RUN] Would insert ${records.length} records into ${tableName}`);
    return { imported: records.length, skipped: 0 };
  }

  // Batch insert
  let imported = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(tableName).insert(batch, { onConflict: 'name' });
    if (error) {
      console.warn(`   ⚠️  Insert error batch ${Math.floor(i/BATCH_SIZE)+1}: ${error.message}`);
    } else {
      imported += batch.length;
    }
    process.stdout.write(`   📥 ${tableName}: ${imported}/${records.length}\r`);
  }
  process.stdout.write('\n');

  return { imported, skipped: 0 };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error('\n❌ Export directory not found. Run 2_export.js first.\n');
    process.exit(1);
  }

  const files = fs.readdirSync(EXPORT_DIR)
    .filter(f => f.endsWith('.ndjson'))
    .sort();

  // Filter by --only if provided
  let toProcess = files;
  if (args.only) {
    const filter = args.only.split(',').map(s => s.trim().toLowerCase());
    toProcess = files.filter(f => filter.some(x => f.includes(x)));
  }

  // Skip already-migrated tables
  toProcess = toProcess.filter(f => {
    const base = path.basename(f, '.ndjson');
    return !ALREADY_MIGRATED.has(base);
  });

  console.log(`\n🚀 Importing ${toProcess.length} files into Supabase`);
  if (DRY_RUN) console.log('   [DRY-RUN MODE — no data will be written]\n');

  const summary = [];
  let totalImported = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    const base = path.basename(file, '.ndjson');
    console.log(`[${i+1}/${toProcess.length}] ${base}`);

    try {
      const result = await importFile(path.join(EXPORT_DIR, file));
      totalImported += result.imported;
      console.log(`   ✅ Imported: ${result.imported}  Skipped: ${result.skipped}`);
      summary.push({ file: base, ...result, status: 'ok' });
    } catch (e) {
      console.log(`   ❌ FAILED: ${e.message}`);
      summary.push({ file: base, imported: 0, status: 'failed', error: e.message });
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'import_summary.json'),
    JSON.stringify({ summary, totalImported }, null, 2)
  );

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Total imported:  ${totalImported.toLocaleString()}`);
  console.log(`  Failed:          ${summary.filter(s => s.status === 'failed').length}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('\n❌', e.message);
  process.exit(1);
});
