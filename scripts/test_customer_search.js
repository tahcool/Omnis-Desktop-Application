const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testFetchCustomers(query = '') {
  console.log(`Searching for customers with query "${query}"...`);
  try {
    const [r1, r2, r3] = await Promise.all([
      supabase.from('customers').select('customer_name').ilike('customer_name', `%${query}%`).limit(10),
      supabase.from('customer_enquiries').select('customer_name').ilike('customer_name', `%${query}%`).limit(10),
      supabase.from('aftersales_handover_records').select('company').ilike('company', `%${query}%`).limit(10),
    ]);

    const names = new Set();
    (r1.data || []).forEach(c => c.customer_name && names.add(c.customer_name.trim()));
    (r2.data || []).forEach(c => c.customer_name && names.add(c.customer_name.trim()));
    (r3.data || []).forEach(c => c.company && names.add(c.company.trim()));

    const resultList = Array.from(names);
    console.log('Result list:', resultList);
  } catch (e) {
    console.error('Error:', e);
  }
}

testFetchCustomers('');
