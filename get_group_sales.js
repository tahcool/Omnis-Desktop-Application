const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('group_sales').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Row keys:", Object.keys(data[0] || {}));
  }
}
run();
