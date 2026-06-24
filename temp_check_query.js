const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function run() {
  console.log("Fetching stock with potential customers...");
  const { data, error } = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("ERROR FETCHING:", error);
  } else {
    console.log("SUCCESS. Total records:", data.length);
    const hitachi = data.filter(d => d.brand === 'Hitachi');
    console.log("Hitachi records:", hitachi);
  }
}
run();
