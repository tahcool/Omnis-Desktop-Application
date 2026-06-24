const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function run() {
  const { data, error } = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("ERROR:", error);
  } else {
    const hitachi = data.filter(d => d.brand === 'Hitachi');
    console.log("HITACHI FOUND:", hitachi.length);
    if(hitachi.length > 0) {
      console.log(hitachi[0]);
    }
  }
}
run();
