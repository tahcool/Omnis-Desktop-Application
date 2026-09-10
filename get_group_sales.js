const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
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
