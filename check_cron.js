const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function updateCron() {
    console.log("Checking current cron jobs...");
    const { data: fetchRes, error: fetchErr } = await supabase.rpc('get_cron_jobs');
    if (fetchErr) {
        console.error("Error fetching cron jobs via RPC (you might need to use standard pg query)", fetchErr);
    } else {
        console.log(fetchRes);
    }
}
updateCron();
