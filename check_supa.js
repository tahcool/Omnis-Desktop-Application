const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  let { data: gs } = await supabase.from('group_sales').select('frappe_id, customer, model, committed_lead_time').order('id', {ascending: false}).limit(5);
  let { data: fm } = await supabase.from('fmb_reports').select('frappe_id, customer_name, machine').order('id', {ascending: false}).limit(5);
  
  console.log("Group Sales:", gs);
  console.log("FMB Reports:", fm);
}
run();
