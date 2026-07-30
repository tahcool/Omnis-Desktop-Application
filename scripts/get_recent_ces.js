const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pfqaeewmlwfayxbgmuaq.supabase.co',
  'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU'
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
