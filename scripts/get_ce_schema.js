const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pfqaeewmlwfayxbgmuaq.supabase.co',
  'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU'
);

async function run() {
  const { data, error } = await supabase
    .from('customer_enquiries')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error(error);
  } else {
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('No data found, cannot infer schema this way.');
    }
  }
}

run();
