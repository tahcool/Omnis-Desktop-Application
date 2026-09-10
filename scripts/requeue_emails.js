const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })());
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('omnis_email_queue')
        .update({ status: 'pending', error_message: null })
        .eq('status', 'failed');

    if (error) {
        console.error('Error requeuing:', error.message);
    } else {
        console.log('Requeued failed emails.');
    }
}
run();
