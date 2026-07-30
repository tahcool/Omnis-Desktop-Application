const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function discoverTables() {
  const tables = [
    'frappe_quotation', 'omnis_quote_lifecycle', 'customer_enquiries',
    'machines', 'products', 'items', 'stock_items', 'fleetrack_machines',
    'aftersales_handover_records', 'sales_orders', 'frappe_sales_order',
    'quotations', 'quotation_items', 'price_list', 'item_prices'
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (!error) {
        console.log(`✅ Table exists: "${t}" - Sample keys:`, Object.keys(data[0] || {}));
      } else {
        // console.log(`❌ Table missing: "${t}" - ${error.message}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

discoverTables();
