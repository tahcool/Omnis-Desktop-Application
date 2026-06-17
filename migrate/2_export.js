#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  FRAPPE → SUPABASE MIGRATION TOOLKIT
 *  Phase 2: Export — Takes the discovery report, downloads ALL records
 *            from every non-empty doctype, saves as NDJSON files.
 *
 *  Usage:
 *    node migrate/2_export.js --key API_KEY --secret API_SECRET [--only "FT Machine,FT Breakdown Log"]
 *
 *  Output: migrate/export/{DocType}.ndjson  (one record per line)
 * ═══════════════════════════════════════════════════════════════════
 */

const axios  = require('axios');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const FRAPPE_URL  = 'https://salestrack.powerstar.co.zw';
const OUT_DIR     = path.join(__dirname, 'export');
const REPORT_FILE = path.join(__dirname, 'discovery_report.json');
const PAGE_SIZE   = 500;

const args = {};
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1];
});

if (!args.key || !args.secret) {
  console.error('\n❌ Usage: node migrate/2_export.js --key API_KEY --secret API_SECRET\n');
  process.exit(1);
}

if (!fs.existsSync(REPORT_FILE)) {
  console.error('\n❌ Run 1_discover.js first to generate discovery_report.json\n');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const http = axios.create({
  baseURL: FRAPPE_URL,
  headers: { Authorization: `token ${args.key}:${args.secret}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 60000
});

// System fields to drop from every record
const SKIP_FIELDS = new Set([
  'docstatus', 'idx', 'owner', 'creation', 'modified', 'modified_by',
  'doctype', '_user_tags', '_comments', '_assign', '_liked_by',
  'column_break_', 'section_break_'
]);

function cleanRecord(rec) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) {
    if ([...SKIP_FIELDS].some(f => k.startsWith(f))) continue;
    if (k.startsWith('column_break') || k.startsWith('section_break')) continue;
    out[k] = v;
  }
  return out;
}

async function exportDoctype(doctype, expectedCount) {
  const slug      = doctype.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outFile   = path.join(OUT_DIR, `${slug}.ndjson`);
  const stateFile = path.join(OUT_DIR, `${slug}.state.json`);

  // Resume support
  let startAt = 0;
  let totalWritten = 0;
  if (fs.existsSync(stateFile)) {
    const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    startAt      = st.next_start ?? 0;
    totalWritten = st.written   ?? 0;
    if (st.done) {
      console.log(`   ⏭  ${doctype} already exported (${totalWritten} records) — skipping.`);
      return totalWritten;
    }
  }

  const fd = fs.openSync(outFile, startAt === 0 ? 'w' : 'a');
  let page = startAt;

  while (true) {
    let data;
    try {
      const res = await http.get(`/api/resource/${encodeURIComponent(doctype)}`, {
        params: {
          fields: '["*"]',
          limit_page_length: PAGE_SIZE,
          limit_start: page,
          order_by: 'creation asc'
        }
      });
      data = res.data.data || [];
    } catch (e) {
      const msg = e.response?.data?.exc_type || e.message;
      console.warn(`\n   ⚠️  ${doctype} page ${page}: ${msg}`);
      break;
    }

    for (const rec of data) {
      fs.writeSync(fd, JSON.stringify(cleanRecord(rec)) + '\n');
      totalWritten++;
    }

    // Save progress
    fs.writeFileSync(stateFile, JSON.stringify({
      doctype, next_start: page + data.length, written: totalWritten, done: data.length < PAGE_SIZE
    }));

    if (data.length < PAGE_SIZE) break;  // last page
    page += data.length;
  }

  fs.closeSync(fd);
  // Mark done
  fs.writeFileSync(stateFile, JSON.stringify({ doctype, done: true, written: totalWritten }));
  return totalWritten;
}

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));

  // Determine which to export
  let toExport = report.with_data;
  if (args.only) {
    const filter = args.only.split(',').map(s => s.trim().toLowerCase());
    toExport = toExport.filter(d => filter.includes(d.name.toLowerCase()));
  }

  console.log(`\n🚀 Exporting ${toExport.length} doctypes from ${FRAPPE_URL}`);
  console.log(`   Output directory: ${OUT_DIR}\n`);

  const summary = [];
  let totalRecords = 0;

  for (let i = 0; i < toExport.length; i++) {
    const dt = toExport[i];
    process.stdout.write(`[${i+1}/${toExport.length}] ${dt.name.padEnd(50)}`);
    try {
      const count = await exportDoctype(dt.name, dt.record_count);
      totalRecords += count;
      console.log(`${String(count).padStart(8)} records`);
      summary.push({ doctype: dt.name, exported: count, status: 'ok' });
    } catch (e) {
      console.log(`   ❌ FAILED: ${e.message}`);
      summary.push({ doctype: dt.name, exported: 0, status: 'failed', error: e.message });
    }
  }

  // Write summary
  fs.writeFileSync(path.join(__dirname, 'export_summary.json'), JSON.stringify({ summary, totalRecords }, null, 2));

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Total records exported: ${totalRecords.toLocaleString()}`);
  console.log(`  Failed:                 ${summary.filter(s => s.status === 'failed').length}`);
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📌 Next step: node migrate/3_import.js\n');
}

main().catch(e => {
  console.error('\n❌', e.message);
  process.exit(1);
});
