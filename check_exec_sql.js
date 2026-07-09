const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
async function check() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: "SELECT 1;" });
    console.log(data, error);
}
check();
