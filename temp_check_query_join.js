const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("DATA LENGTH:", data.length);
    console.log("FIRST:", data[0]);
  }
}
run();
