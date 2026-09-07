const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU");

async function checkColumns() {
  const { data, error } = await supabase.from('omnis_patients').select('*').limit(1);
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : (data ? 'No data but successful query' : error));
}

checkColumns();
