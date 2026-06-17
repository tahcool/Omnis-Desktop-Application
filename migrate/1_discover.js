#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FRAPPE → SUPABASE MIGRATION TOOLKIT
 *  Phase 1: Discovery — Scans ALL doctypes on Frappe, counts records,
 *            classifies them, and outputs a prioritised migration plan.
 *
 *  Usage:
 *    node migrate/1_discover.js --key YOUR_API_KEY --secret YOUR_API_SECRET
 *
 *  Output:
 *    migrate/discovery_report.json  — full data for next phases
 *    migrate/discovery_report.md    — human-readable prioritised table
 * ═══════════════════════════════════════════════════════════════════
 */

const axios  = require('axios');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ── Config ─────────────────────────────────────────────────────────
const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';
const OUT_DIR    = path.join(__dirname);

// Parse CLI args
const args = {};
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1];
});

if (!args.key || !args.secret) {
  console.error('\n❌ Usage: node migrate/1_discover.js --key API_KEY --secret API_SECRET\n');
  console.error('   Get your API key from Frappe: My Settings → API Access → Generate Keys\n');
  process.exit(1);
}

// ── HTTP client ─────────────────────────────────────────────────────
const http = axios.create({
  baseURL: FRAPPE_URL,
  headers: { Authorization: `token ${args.key}:${args.secret}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 30000
});

// ── System doctypes to skip (framework internals) ───────────────────
const SYSTEM_DOCTYPES = new Set([
  'DocType', 'DocField', 'DocPerm', 'DocShare', 'DocType Layout',
  'DocType Action', 'DocType Link', 'DocType State', 'Custom Field',
  'Property Setter', 'Client Script', 'Server Script',
  'User', 'Role', 'Has Role', 'DefaultValue', 'Session Default',
  'Module Def', 'Installed Application', 'Patch Log', 'Error Log',
  'Scheduled Job Log', 'System Settings', 'Print Format',
  'Letter Head', 'Notification', 'Email Template', 'Email Account',
  'File', 'Folder', 'Communication', 'Comment', 'Activity Log',
  'Version', 'Access Log', 'Event', 'ToDo', 'Tag', 'Tag Link',
  'Workflow', 'Workflow State', 'Workflow Action',
  'Translation', 'Workspace', 'Workspace Link', 'Workspace Chart',
  'Dashboard', 'Dashboard Chart', 'Dashboard Chart Link',
  'Report', 'Page', 'Web Form', 'Web Page', 'Website Settings',
  'Blog Post', 'Newsletter', 'Email Group',
  'Data Import', 'Data Export', 'Bulk Update',
  'Address', 'Contact', 'Dynamic Link',
  'Currency', 'Currency Exchange', 'Country', 'Language',
  'Territory', 'Company',
]);

// ── Helpers ─────────────────────────────────────────────────────────
async function getAllDoctypes() {
  console.log('📋 Fetching doctype list from Frappe...');
  // Step 1: get names only (some fields are restricted in list API)
  const res = await http.get('/api/resource/DocType', {
    params: { fields: '["name","module"]', limit_page_length: 1000 }
  });
  const basic = res.data.data || [];
  console.log(`   Got ${basic.length} doctypes, fetching metadata...`);

  // Step 2: use frappe.get_meta to get is_child_table / issingle
  const result = [];
  const CHUNK = 20;
  for (let i = 0; i < basic.length; i += CHUNK) {
    const chunk = basic.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (d) => {
      try {
        const m = await http.get('/api/method/frappe.client.get_meta', {
          params: { doctype: d.name }
        });
        const meta = m.data?.message || m.data?.docs?.[0] || {};
        result.push({
          name:          d.name,
          module:        d.module || meta.module || '',
          is_child_table: meta.istable ? 1 : 0,
          issingle:      meta.issingle ? 1 : 0,
        });
      } catch {
        result.push({ name: d.name, module: d.module || '', is_child_table: 0, issingle: 0 });
      }
    }));
    process.stdout.write(`   Metadata: ${Math.min(i+CHUNK, basic.length)}/${basic.length}\r`);
  }
  console.log(`\n   Metadata loaded for ${result.length} doctypes.`);
  return result;
}

async function getRecordCount(doctype) {
  try {
    const res = await http.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: { fields: '["name"]', limit_page_length: 1, limit_start: 0 }
    });
    // Frappe returns total count in a separate call needed; we use list length as proxy
    // Use the count endpoint
    const c = await http.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: { fields: '["name"]', limit_page_length: 500000, limit_start: 0 }
    });
    return (c.data.data || []).length;
  } catch {
    return -1; // Access denied or doesn't exist
  }
}

async function getRecordCountFast(doctype) {
  try {
    const res = await http.get('/api/method/frappe.client.get_count', {
      params: { doctype, cache: false }
    });
    return res.data.message ?? -1;
  } catch {
    try {
      // Fallback: list with limit 1 — at least tells us if data exists
      const r = await http.get(`/api/resource/${encodeURIComponent(doctype)}`, {
        params: { fields: '["name"]', limit_page_length: 1 }
      });
      return (r.data.data || []).length > 0 ? '1+' : 0;
    } catch { return -1; }
  }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Frappe Discovery — connecting to ${FRAPPE_URL}\n`);

  const doctypes = await getAllDoctypes();
  console.log(`   Found ${doctypes.length} total doctypes on server.\n`);

  // Separate child tables, singles, system vs app doctypes
  const appDoctypes   = doctypes.filter(d =>
    !SYSTEM_DOCTYPES.has(d.name) &&
    !d.issingle
  );
  const childTables   = appDoctypes.filter(d => d.is_child_table);
  const parentTables  = appDoctypes.filter(d => !d.is_child_table);

  console.log(`   ├── App parent doctypes: ${parentTables.length}`);
  console.log(`   ├── App child tables:    ${childTables.length}`);
  console.log(`   └── Skipped (system):    ${doctypes.length - appDoctypes.length}\n`);

  // Count records for each parent doctype
  console.log('📊 Counting records (this may take a few minutes)...\n');
  const results = [];
  let done = 0;

  for (const dt of appDoctypes) {
    const count = await getRecordCountFast(dt.name);
    results.push({
      name:          dt.name,
      module:        dt.module,
      is_child:      !!dt.is_child_table,
      is_single:     !!dt.issingle,
      record_count:  count,
    });
    done++;
    if (done % 10 === 0) {
      process.stdout.write(`   ${done}/${appDoctypes.length} scanned...\r`);
    }
  }

  console.log(`\n✅ Scan complete.\n`);

  // Sort: non-zero records first, by count desc
  results.sort((a, b) => {
    if (a.record_count === b.record_count) return a.name.localeCompare(b.name);
    if (typeof b.record_count === 'number' && typeof a.record_count === 'number') {
      return b.record_count - a.record_count;
    }
    return 0;
  });

  // Classify
  const withData    = results.filter(r => r.record_count > 0 || r.record_count === '1+');
  const empty       = results.filter(r => r.record_count === 0);
  const denied      = results.filter(r => r.record_count === -1);

  // Write JSON report
  const report = { scanned_at: new Date().toISOString(), total: results.length, with_data: withData, empty, denied };
  fs.writeFileSync(path.join(OUT_DIR, 'discovery_report.json'), JSON.stringify(report, null, 2));

  // Write markdown report
  let md = `# Frappe Discovery Report\n`;
  md += `**Scanned:** ${new Date().toLocaleString()}  \n`;
  md += `**Server:** ${FRAPPE_URL}  \n`;
  md += `**Total app doctypes:** ${results.length}  \n\n`;

  md += `## ✅ Doctypes With Data (${withData.length}) — MIGRATE THESE\n\n`;
  md += `| Doctype | Module | Child? | Records |\n|---|---|---|---|\n`;
  withData.forEach(r => {
    md += `| ${r.name} | ${r.module} | ${r.is_child ? '✓' : ''} | ${r.record_count} |\n`;
  });

  md += `\n## ⬜ Empty Doctypes (${empty.length}) — Skip unless schema needed\n\n`;
  md += `| Doctype | Module | Child? |\n|---|---|---|\n`;
  empty.forEach(r => {
    md += `| ${r.name} | ${r.module} | ${r.is_child ? '✓' : ''} |\n`;
  });

  md += `\n## 🔒 Access Denied / Not Accessible (${denied.length})\n\n`;
  denied.forEach(r => md += `- ${r.name}\n`);

  fs.writeFileSync(path.join(OUT_DIR, 'discovery_report.md'), md);

  // Console summary
  console.log('═══════════════════════════════════════════════════');
  console.log(`  DOCTYPES WITH DATA:   ${withData.length}`);
  console.log(`  EMPTY DOCTYPES:       ${empty.length}`);
  console.log(`  ACCESS DENIED:        ${denied.length}`);
  console.log('═══════════════════════════════════════════════════\n');
  console.log('Top 20 by record count:\n');
  withData.slice(0, 20).forEach((r, i) => {
    console.log(`  ${String(i+1).padStart(2)}. ${r.name.padEnd(45)} ${String(r.record_count).padStart(8)} records`);
  });
  console.log('\n📁 Full report saved to:');
  console.log(`   ${path.join(OUT_DIR, 'discovery_report.json')}`);
  console.log(`   ${path.join(OUT_DIR, 'discovery_report.md')}\n`);
  console.log('📌 Next step: node migrate/2_export.js\n');
}

main().catch(e => {
  console.error('\n❌ Discovery failed:', e.response?.data?.exc || e.message);
  process.exit(1);
});
