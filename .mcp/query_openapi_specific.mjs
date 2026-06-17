const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

async function main() {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY
    }
  });
  
  const spec = await resp.json();
  const tablesToCheck = ['orders', 'frappe_group_sales', 'group_sales', 'order_tracking', 'st_orders', 'frappe_order_tracking', 'frappe_opportunity', 'quotations'];
  
  for (const t of tablesToCheck) {
    if (spec.definitions[t]) {
      console.log(`Table: ${t}`);
      console.log(`  Columns: ${Object.keys(spec.definitions[t].properties).join(', ')}`);
    } else {
      console.log(`Table ${t} not found in OpenAPI spec.`);
    }
  }
}
main();
