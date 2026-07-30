const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function searchItemWithPrices(query) {
  console.log(`Searching items with prices for "${query}"...`);
  
  // 1. Search products master
  const { data: prodData } = await supabase
    .from('products')
    .select('item_code, item_name, rate, brand_name')
    .or(`item_code.ilike.%${query}%,item_name.ilike.%${query}%`)
    .limit(10);

  // 2. Search quotation items
  const { data: qData } = await supabase
    .from('quotation_items')
    .select('parent, item_code, item_name, rate, amount')
    .or(`item_code.ilike.%${query}%,item_name.ilike.%${query}%`)
    .order('id', { ascending: false })
    .limit(10);

  console.log('Products found:', prodData ? prodData.length : 0);
  console.log('Quotation items found:', qData ? qData.length : 0);

  if (qData && qData.length > 0) {
    console.log('Recent quote prices for query:');
    qData.forEach(q => {
      console.log(`- ${q.item_name} (${q.item_code}): Rate = $${q.rate} (Quote: ${q.parent})`);
    });
  }
}

searchItemWithPrices('B730');
searchItemWithPrices('Tipper');
