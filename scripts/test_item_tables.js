const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectItemTables() {
  console.log('Testing item tables search...');
  
  try {
    // 1. Check frappe_quotation_item if available
    const { data: qItems, error: qErr } = await supabase
      .from('frappe_quotation_item')
      .select('item_code, item_name, description, rate, amount, parent, created_on')
      .limit(10);
    console.log('frappe_quotation_item sample count:', qItems ? qItems.length : 0, qErr?.message || '');
    if (qItems && qItems.length > 0) {
      console.log('Sample quotation item:', qItems[0]);
    }
  } catch (e) {
    console.log('frappe_quotation_item error:', e.message);
  }

  try {
    // 2. Check stock contracts or items tables
    const { data: stockItems, error: stockErr } = await supabase
      .from('stock_contract_items')
      .select('*')
      .limit(5);
    console.log('stock_contract_items count:', stockItems ? stockItems.length : 0, stockErr?.message || '');
  } catch (e) {
    console.log('stock_contract_items error:', e.message);
  }

  try {
    // 3. Check customer enquiries items
    const { data: enq, error: enqErr } = await supabase
      .from('customer_enquiries')
      .select('items')
      .not('items', 'is', null)
      .limit(20);
    console.log('customer_enquiries count with items:', enq ? enq.length : 0);
    if (enq) {
      const allItemNames = new Set();
      enq.forEach(row => {
        if (Array.isArray(row.items)) {
          row.items.forEach(it => it.name && allItemNames.add(it.name));
        }
      });
      console.log('Sample item names from enquiries:', Array.from(allItemNames).slice(0, 10));
    }
  } catch (e) {
    console.log('customer_enquiries items error:', e.message);
  }
}

inspectItemTables();
