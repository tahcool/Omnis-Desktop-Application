const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function checkSchema() {
    const { data: q1 } = await supabase.from('quotations').select('*').limit(1);
    console.log("Quotations:", q1);
    const { data: q2 } = await supabase.from('quotation_items').select('*').limit(1);
    console.log("Items:", q2);
}
checkSchema();
