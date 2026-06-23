const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
supabase.from('quotation_items').select('*').limit(1).then(r => {
    if (r.data && r.data.length > 0) console.log(Object.keys(r.data[0]));
    else console.log("No data:", r);
}).catch(e => console.log(e));
