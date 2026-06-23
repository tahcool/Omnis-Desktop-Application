const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
supabase.from('products').select('id', { count: 'exact', head: true }).then(r => console.log("Items count:", r.count)).catch(e => console.log(e));
