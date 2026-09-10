const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })()));

async function checkColumns() {
  const { data, error } = await supabase.from('omnis_patients').select('*').limit(1);
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : (data ? 'No data but successful query' : error));
}

checkColumns();
