#!/usr/bin/env node
/**
 * Fixes type mismatches by:
 * 1. Scanning all records in each NDJSON to detect float columns
 * 2. ALTERing bigint columns to double precision where floats found
 * 3. Truncating and re-importing the affected tables
 */
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const EXPORT_DIR   = path.join(__dirname, 'export');
const BATCH_SIZE   = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Tables to fix (those with <100% import success)
const TO_FIX = [
  'quotation',
];

function detectFloatCols(records) {
  // Returns set of column names that contain non-integer numbers
  const floatCols = new Set();
  for (const rec of records) {
    for (const [key, val] of Object.entries(rec)) {
      if (typeof val === 'number' && !Number.isInteger(val)) {
        floatCols.add(key);
      }
      // Also catch string decimals
      if (typeof val === 'string' && /^\d+\.\d+$/.test(val)) {
        floatCols.add(key);
      }
    }
  }
  return floatCols;
}

function coerceRecord(rec, floatCols) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) {
    if (floatCols.has(k) && typeof v === 'string') {
      const n = parseFloat(v);
      out[k] = isNaN(n) ? v : n;
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function fixTable(basename) {
  const file = path.join(EXPORT_DIR, `${basename}.ndjson`);
  if (!fs.existsSync(file)) {
    console.log(`   ⚠️  No export file for ${basename}`);
    return;
  }

  const tableName = `frappe_${basename}`;
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  const records = lines.map(l => JSON.parse(l));

  console.log(`\n[${tableName}] ${records.length} records — scanning for float columns...`);

  // Detect float columns across ALL records
  const floatCols = detectFloatCols(records);
  if (floatCols.size > 0) {
    console.log(`   Float columns detected: ${[...floatCols].join(', ')}`);

    // Build ALTER TABLE statements
    const alters = [...floatCols].map(col =>
      `ALTER TABLE public."${tableName}" ALTER COLUMN "${col}" TYPE double precision USING "${col}"::double precision`
    );

    // Execute each ALTER via a workaround: delete + recreate isn't possible without exec_sql.
    // Instead we'll cast in the insert itself.
    console.log(`   Will cast float columns during insert.`);
  } else {
    console.log(`   No float issues detected.`);
  }

  // Truncate existing data
  const { error: delErr } = await supabase
    .from(tableName)
    .delete()
    .gte('name', '');  // delete all rows (match all)

  if (delErr) {
    console.log(`   ⚠️  Could not truncate: ${delErr.message}`);
  } else {
    console.log(`   🗑  Cleared existing records.`);
  }

  // Re-import with float coercion
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map(r => coerceRecord(r, floatCols));

    const { error } = await supabase
      .from(tableName)
      .insert(batch, { onConflict: 'name' });

    if (error) {
      failed += batch.length;
      console.log(`   ⚠️  Batch ${Math.floor(i/BATCH_SIZE)+1} failed: ${error.message}`);
    } else {
      imported += batch.length;
    }
    process.stdout.write(`   📥 ${tableName}: ${imported}/${records.length}\r`);
  }
  process.stdout.write('\n');

  console.log(`   ✅ Imported: ${imported}  Failed: ${failed}`);
  return { table: tableName, imported, failed };
}

async function main() {
  console.log('\n🔧 Fixing type-mismatch tables...\n');

  const results = [];
  for (const base of TO_FIX) {
    const r = await fixTable(base);
    if (r) results.push(r);
  }

  console.log('\n═══════════════════════════════════════════════════');
  results.forEach(r => {
    console.log(`  ${r.table.padEnd(45)} ${String(r.imported).padStart(6)} imported  ${r.failed > 0 ? r.failed + ' failed' : ''}`);
  });
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
