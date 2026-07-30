/**
 * import_frappe_ces_to_supabase.js
 * 
 * One-time (and re-runnable) script to import all existing Frappe/ERPNext
 * Opportunity records into the Supabase customer_enquiries table.
 *
 * Run from the omnis project root:
 *   node import_frappe_ces_to_supabase.js
 *
 * Prerequisites:
 *   npm install node-fetch @supabase/supabase-js
 *
 * The script uses upsert on `frappe_ref` so it's safe to run multiple
 * times — existing records will be updated, not duplicated.
 */

const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────────────────

const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL || 'https://salestrack.powerstar.co.zw';
const FRAPPE_API_KEY  = process.env.FRAPPE_API_KEY  || '';  // set in env or fill in
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET || '';

const SUPABASE_URL  = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
// Use the SERVICE ROLE key for import (bypasses RLS). Get from Supabase dashboard > Settings > API
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_KEY env variable (Settings > API > service_role key)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Frappe helpers ───────────────────────────────────────────────────────────

const FRAPPE_HEADERS = FRAPPE_API_KEY
  ? { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` }
  : {}; // falls back to unauthenticated (needs allow_guest on endpoint)

async function fetchFrappeOpp(start = 0, pageLen = 50) {
  const fields = JSON.stringify([
    'name', 'party_name', 'customer_name', 'title', 'transaction_date',
    'status', 'company', 'opportunity_amount', 'currency',
    'custom_salesperson', 'opportunity_owner', 'owner', 'modified',
  ]);

  const url = `${FRAPPE_BASE_URL}/api/resource/Opportunity`
    + `?fields=${encodeURIComponent(fields)}`
    + `&order_by=modified+desc`
    + `&limit_start=${start}`
    + `&limit_page_length=${pageLen}`;

  const res = await fetch(url, { headers: FRAPPE_HEADERS });
  if (!res.ok) throw new Error(`Frappe HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data || [];
}

// Status mapping: Frappe → Supabase
function mapStatus(frappeStatus) {
  const map = {
    'Open':      'Open',
    'Quotation': 'Quoted',
    'Converted': 'Closed',
    'Lost':      'Closed',
    'Replied':   'In Progress',
  };
  return map[frappeStatus] || 'Open';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄  Starting Frappe → Supabase CE import...\n');

  let start = 0;
  const pageLen = 50;
  let totalImported = 0;
  let totalSkipped = 0;

  while (true) {
    console.log(`   Fetching Frappe page (start=${start})...`);
    let rows;
    try {
      rows = await fetchFrappeOpp(start, pageLen);
    } catch (e) {
      console.error(`❌  Failed to fetch from Frappe: ${e.message}`);
      break;
    }

    if (!rows.length) {
      console.log('   No more records from Frappe. Done.\n');
      break;
    }

    const records = rows.map(r => ({
      // Map Frappe → Supabase schema
      frappe_ref:      r.name,
      customer_name:   r.party_name || r.customer_name || r.title || '(Unknown)',
      request_details: r.title || r.name,
      estimated_value: parseFloat(r.opportunity_amount) || 0,
      status:          mapStatus(r.status),
      sales_rep_name:  r.custom_salesperson || r.opportunity_owner || r.owner || null,
      target_company:  r.company || null,
      company:         r.company || null,
      items:           [],                // Frappe Opportunity items not migrated here
      source:          'frappe',
      // Use Frappe transaction_date if available, else modified
      created_at:      r.transaction_date
        ? new Date(r.transaction_date).toISOString()
        : new Date(r.modified).toISOString(),
      updated_at:      new Date(r.modified).toISOString(),
    }));

    // Upsert on frappe_ref (unique per Frappe doc)
    const { data, error } = await supabase
      .from('customer_enquiries')
      .upsert(records, { onConflict: 'frappe_ref', ignoreDuplicates: false });

    if (error) {
      console.error(`❌  Supabase upsert error at start=${start}:`, error.message);
      // Continue anyway to get as many as possible
      totalSkipped += rows.length;
    } else {
      totalImported += rows.length;
      console.log(`   ✅  Upserted ${rows.length} records (total so far: ${totalImported})`);
    }

    if (rows.length < pageLen) break; // last page
    start += pageLen;

    // Polite rate-limit pause
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n🎉  Import complete!`);
  console.log(`   Imported : ${totalImported}`);
  console.log(`   Skipped  : ${totalSkipped}`);

  // Verify count
  const { count } = await supabase
    .from('customer_enquiries')
    .select('*', { count: 'exact', head: true });
  console.log(`   Total rows in Supabase customer_enquiries: ${count}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
