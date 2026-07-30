const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(2);
  console.log(JSON.stringify(data, null, 2));
}

checkProducts();
