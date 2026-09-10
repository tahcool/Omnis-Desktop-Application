const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })());
const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchFrappeServiceLogs() {
  const fields = '["name","machine","model","service_date","service_hmr","technician_name","service_type","modified"]';
  const API_KEY = '73624aafe4cc8cc';
  const API_SECRET = '2613b1d70488058';
  
  const res = await fetch(`${FRAPPE_URL}/api/resource/FT%20Service%20Log?fields=${encodeURIComponent(fields)}&limit_page_length=5000`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `token ${API_KEY}:${API_SECRET}`
    },
  });
  
  const data = await res.json();
  if (data.exc) {
    console.error("Frappe Error:", data.exc);
    return [];
  }
  return data?.data || [];
}

async function sync() {
  console.log('Starting FT Service Logs sync...');
  const logs = await fetchFrappeServiceLogs();
  console.log(`Fetched ${logs.length} service logs from Frappe.`);

  if (logs.length === 0) {
    console.log('No logs fetched. Aborting.');
    return;
  }

  const rows = logs.map(l => ({
    id: l.name,
    machine: l.machine,
    model: l.model,
    service_date: l.service_date ? new Date(l.service_date).toISOString().split('T')[0] : null,
    service_hmr: parseFloat(l.service_hmr) || null,
    technician_name: l.technician_name || null,
    service_type: l.service_type ? String(l.service_type) : null,
    frappe_modified: l.modified ? new Date(l.modified).toISOString() : null,
    updated_at: new Date().toISOString(),
  }));

  const BATCH = 500;
  let inserted = 0;
  
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('ft_service_logs')
      .upsert(batch, { onConflict: 'id' });
      
    if (error) {
      console.error(`Batch ${i}-${i + BATCH} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`✅ Sync complete. ${inserted}/${rows.length} logs upserted.`);
}

sync().catch(console.error);
