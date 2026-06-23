const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkCols() {
    const { data } = await supabase.from('frappe_quotation').select('name, custom_next_follow_up_date, custom_follow_up_status').limit(1);
    console.log(data);
}
checkCols();
