const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function check() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: "SELECT 1;" });
    console.log(data, error);
}
check();
