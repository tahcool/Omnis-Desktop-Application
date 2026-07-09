const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
async function check() {
  const { data } = await supabase.from('stock_company_mappings').select('*').ilike('brand', 'Hitachi');
  console.log(data);
}
check();
