const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU';
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
