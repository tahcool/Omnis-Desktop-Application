const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function run() {
    const { data: items, error: e1 } = await supabase.from('items').select('*').limit(1);
    console.log("items:", e1 ? e1.message : items);
    
    const { data: sp, error: e2 } = await supabase.from('sales_persons').select('*').limit(1);
    console.log("sales_persons:", e2 ? e2.message : sp);
}
run();
