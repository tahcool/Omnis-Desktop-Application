const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pfqaeewmlwfayxbgmuaq.supabase.co',
  (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })())
);

async function run() {
  const { data, error } = await supabase
    .from('customer_enquiries')
    .select('id, submitted_by, sales_rep_name')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

run();
