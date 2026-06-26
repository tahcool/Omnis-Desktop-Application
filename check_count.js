const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
async function check() {
    const res = await supabase.from('newsletters').select('*').order('created_at', { ascending: false });
    console.log("newsletters data:", res.data ? res.data.length : null);
    console.log("newsletters error:", res.error);
}
check();
