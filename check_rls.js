const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })()));

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies');
  console.log('Policies:', data || error);
}

checkRLS();
