const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function run() {
     const { data, error } = await supabase.from('customers').select('*').limit(1);
     console.log("error:", error);
}
run();
