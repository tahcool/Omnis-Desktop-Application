const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
async function run() {
     const { data, error } = await supabase.from('customers').select('*').limit(1);
     console.log("error:", error);
}
run();
