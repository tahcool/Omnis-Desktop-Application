const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkQueue() {
    const { data, error } = await supabase.from('omnis_email_queue').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("Latest queue items:");
        data.forEach(row => {
            console.log(`- ID: ${row.id}, To: ${row.to_email}, Status: ${row.status}, Created: ${row.created_at}`);
        });
    }
}
checkQueue();
