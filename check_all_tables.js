const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function getTables() {
    const { data, error } = await supabase.rpc('get_tables');
    if (error) {
        console.log("No rpc, let's try just from quotations...");
    } else {
        console.log(data);
    }
}
getTables();
