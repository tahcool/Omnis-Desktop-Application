/**
 * sync_fmb_machines.js
 * Syncs machine-level order data from Frappe get_weekly_gsm_report
 * into the Supabase fmb_report_machines table.
 *
 * Run: node sync_fmb_machines.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU';
const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';
const FRAPPE_METHOD = 'powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchFrappeOrders(company) {
  const res = await fetch(`${FRAPPE_URL}/api/method/${FRAPPE_METHOD}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, from_date: '', to_date: '' }),
  });
  const data = await res.json();
  return data?.message?.current_orders || [];
}

async function sync() {
  console.log('Starting FMB Report Machines sync...');

  const companies = ['Machinery Exchange', 'Sinopower'];
  const allOrders = [];

  for (const company of companies) {
    console.log(`  Fetching orders for: ${company}`);
    const orders = await fetchFrappeOrders(company);
    console.log(`  → ${orders.length} machine rows fetched`);
    allOrders.push(...orders.map(o => ({ ...o, _company: company })));
  }

  if (allOrders.length === 0) {
    console.log('No orders fetched. Aborting.');
    return;
  }

  // Map to Supabase schema
  const rows = allOrders.map(o => ({
    report_id: o.report_id,
    machine_id: o.machine_id || null,
    machine: o.machine || null,
    brand: o.brand || null,
    qty: parseFloat(o.qty) || 1,
    status: o.status || null,
    target_handover: o.target_handover || null,
    revised_handover: o.revised_handover || null,
    actual_handover: o.actual_handover || null,
    committed_lead_time: o.committed_lead_time || null,
    notes: o.notes || null,
    internal_notes: o.internal_notes || null,
    days_left: parseInt(o.days_left) || null,
    owner: o.owner || null,
    order_date: o.order_date ? new Date(o.order_date).toISOString() : null,
    last_update: o.last_update ? new Date(o.last_update).toISOString() : null,
    updated_at: new Date().toISOString(),
  }));

  // Truncate existing rows then insert fresh (avoids UNIQUE constraint issues with NULL machine_id)
  const { error: delError } = await supabase
    .from('fmb_report_machines')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (delError) {
    console.error('Clear error:', delError.message);
    return;
  }

  // Insert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('fmb_report_machines')
      .insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i + BATCH} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`✅ Sync complete. ${inserted}/${rows.length} rows upserted.`);
}

sync().catch(console.error);
