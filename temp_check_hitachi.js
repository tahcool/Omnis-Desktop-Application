const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await sp.from('stock_inventory').select('*').eq('brand', 'Hitachi');
  console.log("HITACHI DATA:", data);
}
run();
