const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkProductsAndQuotationItems() {
  console.log('--- PRODUCTS TABLE SAMPLE ---');
  const { data: prodData, error: prodErr } = await supabase
    .from('products')
    .select('id, item_code, item_name, rate, brand_name, uom')
    .limit(10);
  console.log('Products count:', prodData ? prodData.length : 0, prodErr?.message || '');
  console.table(prodData || []);

  console.log('--- QUOTATION_ITEMS TABLE SAMPLE ---');
  const { data: qItemData, error: qItemErr } = await supabase
    .from('quotation_items')
    .select('id, parent, item_code, item_name, rate, amount')
    .order('id', { ascending: false })
    .limit(10);
  console.log('Quotation items count:', qItemData ? qItemData.length : 0, qItemErr?.message || '');
  console.table(qItemData || []);
}

checkProductsAndQuotationItems();
