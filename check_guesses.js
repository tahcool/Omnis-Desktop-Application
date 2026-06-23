const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function getAllTables() {
    // A trick to get all tables: query from pg_catalog if we have access, or just guess.
    // Let's just try to fetch 1 row from some guessed tables
    const guesses = ['item_taxes', 'item_defaults', 'product_taxes', 'item_variants'];
    for(const t of guesses) {
        const { error } = await supabase.from(t).select('*').limit(1);
        if(!error) console.log(t, "exists!");
    }
    console.log("Done checking guesses.");
}
getAllTables();
