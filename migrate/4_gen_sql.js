#!/usr/bin/env node
/**
 * Generates CREATE TABLE SQL for all NDJSON export files.
 * Output: migrate/create_tables.sql — run this in Supabase SQL Editor.
 */
const fs   = require('fs');
const path = require('path');

const EXPORT_DIR = path.join(__dirname, 'export');
const OUT_FILE   = path.join(__dirname, 'create_tables.sql');

// Tables to skip entirely
const SKIP = new Set([
  'ft_machine', 'ft_breakdown_log', 'ft_defect', 'ft_defects_log',
  'ft_service_plan', 'ft_service_log', 'ft_technician', 'ft_hmr_log',
  'email_queue', 'deleted_document', 'route_history', 'error_snapshot',
  'data_import_log', 'workspace_shortcut', 'workflow_action_permitted_role',
  'workflow_action_master', 'notification_log', 'notification_settings',
  'console_log', 'prepared_report', 'document_share_key',
  'list_view_settings', 'dashboard_settings', 'auto_email_report',
  'web_template', 'color', 'salutation', 'gender', 'print_style',
  'module_onboarding', 'module_profile', 'role_profile', 'custom_role',
  'user_type', 'website_theme', 'email_domain', 'email_unsubscribe',
  'top_bar_item', 'kanban_board', 'form_tour',
  // Empty files (0 bytes)
]);

function inferPgType(val) {
  if (val === null || val === undefined) return 'text';
  if (typeof val === 'boolean')          return 'boolean';
  if (typeof val === 'number')           return Number.isInteger(val) ? 'bigint' : 'double precision';
  if (typeof val === 'object')           return 'jsonb';
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'timestamptz';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'date';
  return 'text';
}

function safeCol(name) {
  return '"' + name.replace(/"/g, '') + '"';
}

const files = fs.readdirSync(EXPORT_DIR)
  .filter(f => f.endsWith('.ndjson'))
  .sort();

let sql = `-- Frappe → Supabase: Auto-generated CREATE TABLE statements
-- Generated: ${new Date().toISOString()}
-- Run this entire file in the Supabase SQL Editor before running 3_import.js
-- Tables are prefixed with "frappe_" to keep them separate from existing tables.

`;

let tableCount = 0;

for (const file of files) {
  const base = path.basename(file, '.ndjson');
  if (SKIP.has(base)) continue;

  const fullPath = path.join(EXPORT_DIR, file);
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) continue;

  // Read first line only to get schema
  const fd = fs.openSync(fullPath, 'r');
  const buf = Buffer.alloc(Math.min(stat.size, 4096));
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const firstLine = buf.toString('utf8').split('\n')[0];

  let sample;
  try { sample = JSON.parse(firstLine); } catch { continue; }

  const tableName = `frappe_${base}`;
  const cols = [];

  for (const [key, val] of Object.entries(sample)) {
    if (key === 'name') continue;
    const pgType = inferPgType(val);
    cols.push(`  ${safeCol(key)} ${pgType}`);
  }

  sql += `CREATE TABLE IF NOT EXISTS public.${safeCol(tableName)} (\n`;
  sql += `  "name" text PRIMARY KEY`;
  if (cols.length > 0) {
    sql += `,\n${cols.join(',\n')}`;
  }
  sql += `\n);\n`;
  sql += `ALTER TABLE public.${safeCol(tableName)} ENABLE ROW LEVEL SECURITY;\n`;
  sql += `CREATE POLICY "Allow all for authenticated" ON public.${safeCol(tableName)} FOR ALL TO authenticated USING (true);\n\n`;

  tableCount++;
}

fs.writeFileSync(OUT_FILE, sql);
console.log(`\n✅ Generated SQL for ${tableCount} tables.`);
console.log(`📁 File: ${OUT_FILE}`);
console.log(`   Size: ${(fs.statSync(OUT_FILE).size / 1024).toFixed(1)} KB\n`);
console.log('👉 Next: Copy and run create_tables.sql in the Supabase SQL Editor');
console.log('   Then run: node migrate/3_import.js\n');
