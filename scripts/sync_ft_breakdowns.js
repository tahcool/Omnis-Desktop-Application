const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU';
const FRAPPE_URL = 'https://fleetrack.machinery-exchange.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchFrappeBreakdowns() {
  const fields = '["*"]';
  
  // NOTE: User must provide valid API key/secret here before running
  const API_KEY = process.env.FRAPPE_API_KEY || '07660480c74686c';
  const API_SECRET = process.env.FRAPPE_API_SECRET || '82899cba0bfdc36';
  
  if (API_KEY === 'YOUR_FRAPPE_API_KEY') {
    console.warn("WARNING: Using dummy API keys. Please set FRAPPE_API_KEY and FRAPPE_API_SECRET env variables.");
  }

  const res = await fetch(`${FRAPPE_URL}/api/resource/FT%20Breakdown%20Log?fields=${encodeURIComponent(fields)}&limit_page_length=5000`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `token ${API_KEY}:${API_SECRET}`
    },
  });
  
  const data = await res.json();
  if (data.exc || !data.data) {
    console.error("Frappe Error:", data.exc || data);
    return [];
  }
  return data?.data || [];
}

async function sync() {
  console.log('Starting FT Breakdowns sync...');
  const logs = await fetchFrappeBreakdowns();
  console.log(`Fetched ${logs.length} breakdowns from Frappe.`);

  if (logs.length === 0) {
    console.log('No breakdowns fetched. Aborting.');
    return;
  }

  const rows = logs.map(l => ({
    frappe_name: l.name,
    machine: l.machine || null,
    customer: l.customer || null,
    customer_ref: l.customer_ref || null,
    region: l.region || null,
    model: l.model || null,
    serial_number: l.serial_number || null,
    fleet_no: l.fleet_no || null,
    current_hmr: l.current_hmr || null,
    warranty_status: l.warranty_status || null,
    description: l.description || null,
    breakdown_date: l.breakdown_date || null,
    urgent: l.urgent == 1,
    responsibility: l.responsibility || null,
    category: l.category || null,
    parts_eta: l.parts_eta || null,
    on_hold: l.on_hold == 1,
    quote_date: l.quote_date || null,
    breakdown_end_date: l.end_date || l.breakdown_end_date || null,
    ted: l.ted || null,
    red: l.red || null,
    out_eta: l.out_eta || null,
    is_the_machine_still_running: l.is_the_machine_still_running || null,
    status: l.status || null,
    manager_comments: l.manager_comments || null,
    supervisor_approved: l.supervisor_approved == 1,
    sent_to_customer: l.sent_to_customer == 1,
  }));

  const BATCH = 500;
  let inserted = 0;
  
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('ft_breakdown_logs')
      .upsert(batch, { onConflict: 'frappe_name' });
      
    if (error) {
      console.error(`Batch ${i}-${i + BATCH} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`✅ Sync complete. ${inserted}/${rows.length} breakdowns migrated.`);
}

sync().catch(console.error);
