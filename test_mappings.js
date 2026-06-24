const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function check() {
  const { data } = await supabase.from('stock_company_mappings').select('*').ilike('brand', 'Hitachi');
  console.log(data);
}
check();
