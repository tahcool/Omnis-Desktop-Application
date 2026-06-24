const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function run() {
  const { data, error } = await sp.from('stock_inventory').select('*').eq('brand', 'Hitachi');
  console.log("HITACHI DATA:", data);
}
run();
