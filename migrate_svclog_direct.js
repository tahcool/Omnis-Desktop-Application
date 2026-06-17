/**
 * Direct FT Service Log migration: CSV → Supabase
 * Run: node migrate_svclog_direct.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const CSV_PATH = 'C:\\Users\\Administrator\\Downloads\\FT_Service_Log.csv';
const TABLE = 'ft_service_log';
const CHUNK = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CSV parser (handles all line ending styles) ───────────────────────────────
function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i], nx = normalized[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim()); field = '';
        if (row.some(c => c)) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(c => c)) rows.push(row); }
  return rows;
}

// ── Map a raw data row (first column is blank in Frappe export) ───────────────
// Column Name row: ["Column Name:","name","machine","service_hmr","service_date",
//                   "technician","notes","model","previous_service_date","previous_service_hmr","service_type"]
// Data row:        ["","2022-10-26-00003","86SL50L1NEN008793",2034.4,"25-10-2022",...]
function mapRow(dataRow, colNames) {
  const r = {};
  colNames.forEach((col, i) => { if (col) r[col] = (dataRow[i] || '').toString().trim(); });

  const parseDate = (s) => {
    if (!s) return null;
    // Frappe exports dates as "dd-mm-yyyy" or "yyyy-mm-dd"
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [d, m, y] = s.split('-');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  return {
    machine:        r.machine || null,
    service_date:   parseDate(r.service_date) || null,
    service_type:   r.service_type ? Number(r.service_type) : null,  // might be numeric
    hmr_at_service: r.service_hmr ? Number(r.service_hmr) : null,
    technician:     r.technician || null,
    notes:          r.notes && r.notes !== 'Nil' ? r.notes : null,
    model:          r.model || null,
    logged_by:      'Frappe',
    frappe_name:    r.name || null,
    created_at:     new Date().toISOString(),
    // Store extra fields as-is for reference
    region:         null,
    customer:       null,
  };
}

async function run() {
  console.log('Reading CSV...');
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(text);
  console.log(`Total rows in CSV: ${rows.length}`);

  // Find the "Column Name:" row — that has the actual field names
  let colNames = [];
  let dataStart = -1;
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    if (rows[i][0] && rows[i][0].toLowerCase().includes('column name')) {
      colNames = rows[i].slice(1); // skip the "Column Name:" label cell
      console.log(`Found column names at row ${i + 1}:`, colNames.join(', '));
    }
    if (rows[i][0] && rows[i][0].toLowerCase().includes('start entering')) {
      dataStart = i + 1;
      console.log(`Data starts at row ${dataStart + 1}`);
      break;
    }
  }

  if (dataStart < 0 || colNames.length === 0) {
    console.error('Could not find column names or data start row!');
    process.exit(1);
  }

  // Prepend empty string for the blank first column in data rows
  const fullColNames = ['', ...colNames];

  const dataRows = rows.slice(dataStart);
  console.log(`Data rows to process: ${dataRows.length}`);

  // Map all rows
  const records = dataRows
    .map(r => mapRow(r, fullColNames))
    .filter(r => r.machine && r.frappe_name); // must have machine and a Frappe ID

  console.log(`Valid records after mapping: ${records.length}`);

  // Get existing frappe_names from Supabase
  console.log('Checking existing records in Supabase...');
  const { data: existing } = await supabase.from(TABLE).select('frappe_name').limit(10000);
  const existingSet = new Set((existing || []).map(r => r.frappe_name).filter(Boolean));
  console.log(`Already in Supabase: ${existingSet.size}`);

  const toInsert = records.filter(r => !existingSet.has(r.frappe_name));
  console.log(`New records to insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('Nothing to insert — all records already migrated!');
    return;
  }

  // Batch insert
  let inserted = 0, errors = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await supabase.from(TABLE).insert(chunk);
    if (error) {
      console.error(`  ❌ Chunk ${Math.floor(i/CHUNK)+1} error:`, error.message);
      // Log first failed record for debugging
      if (errors === 0) console.error('  First failed record:', JSON.stringify(chunk[0]));
      errors++;
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  ✓ Inserted ${inserted}/${toInsert.length}...`);
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Total in Supabase now: ~${existingSet.size + inserted}`);
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
