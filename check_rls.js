const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU");

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies');
  console.log('Policies:', data || error);
}

checkRLS();
