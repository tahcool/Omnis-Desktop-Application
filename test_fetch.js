const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await supabase.from('quotations').select('name').eq('name', 'CMED SAL-QTN-26-3591 -');
  console.log("Quotes with that exact name:", data);

  const { data: data2 } = await supabase.from('quotations').select('name').ilike('name', '%3591%');
  console.log("Quotes containing 3591:", data2);
}
run();
