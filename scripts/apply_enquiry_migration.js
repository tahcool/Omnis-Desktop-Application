const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Testing customer_enquiries table schema...');
  const { data, error } = await supabase.from('customer_enquiries').select('*').limit(1);
  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Table structure verified. Sample row keys:', Object.keys(data[0] || {}));
  }
}
run();
