const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
async function check() {
    const res = await supabase.from('newsletters').select('*').order('created_at', { ascending: false });
    console.log("newsletters data:", res.data ? res.data.length : null);
    console.log("newsletters error:", res.error);
}
check();
