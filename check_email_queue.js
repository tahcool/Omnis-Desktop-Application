const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkQueue() {
    const { data, error } = await supabase.from('omnis_email_queue')
        .select('*')
        .in('status', ['pending', 'failed'])
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("Latest queue items:");
        data.forEach(row => {
            console.log(`- ID: ${row.id}, To: ${row.to_email}, Status: ${row.status}, Subject: ${row.subject}, Created: ${row.created_at}`);
        });
    }
}
checkQueue();
