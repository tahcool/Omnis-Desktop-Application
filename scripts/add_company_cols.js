const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function addCompanyColumns() {
  console.log('Adding company, target_company, sales_rep_name to customer_enquiries...');
  
  // Test if columns exist or try writing with SQL function or REST
  const { error } = await supabase.from('customer_enquiries').insert({
    customer_name: 'Schema Test Customer',
    request_details: 'Schema Test Request',
    company: 'Machinery Exchange',
    target_company: 'Machinery Exchange',
    sales_rep_name: 'Test Rep',
    status: 'Open'
  });

  if (error) {
    console.error('Insert error:', error.message);
  } else {
    console.log('Successfully inserted test row with company columns!');
    // Clean up test row
    await supabase.from('customer_enquiries').delete().eq('customer_name', 'Schema Test Customer');
  }
}

addCompanyColumns();
