const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  let { data: d1 } = await supabase.from('fmb_reports').select('*').limit(1);
  let { data: d2 } = await supabase.from('order_machines').select('*').limit(1);
  console.log("fmb_reports keys:", Object.keys(d1[0] || {}));
  console.log("order_machines keys:", Object.keys(d2[0] || {}));
}
run();
