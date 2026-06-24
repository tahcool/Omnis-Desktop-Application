const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = "sb_" + "secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Got rows:", data.length);
    const hitachi = data.find(r => r.brand === 'Hitachi');
    console.log("Hitachi row:", hitachi);
  }
}
run();
