const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPA_SERVICE = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const supabase = createClient(SUPA_URL, SUPA_SERVICE);

async function run() {
  const { data, error } = await supabase.from('customer_enquiries').select('*').limit(5).order('created_at', { ascending: false });
  console.log(JSON.stringify(data, null, 2));
}
run();
