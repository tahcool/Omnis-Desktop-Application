const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function initAllLifecycles() {
    console.log("Fetching all active quotes from Frappe Quotations...");
    const { data: quotes, error: fetchErr } = await supabase
        .from('frappe_quotation')
        .select('name, transaction_date')
        .neq('status', 'Lost')
        .neq('status', 'Cancelled');

    if (fetchErr) {
        console.error("Error fetching quotes:", fetchErr);
        return;
    }

    console.log("Found " + quotes.length + " active quotes. Initializing missing lifecycle tracking...");
    
    // Process in batches of 500
    const batchSize = 500;
    let initializedCount = 0;
    
    for (let i = 0; i < quotes.length; i += batchSize) {
        const batch = quotes.slice(i, i + batchSize);
        const lifecyclePayload = batch.map(q => {
            const txDate = new Date(q.transaction_date || new Date());
            
            const stage1 = new Date(txDate);
            stage1.setDate(stage1.getDate() + 3);
            
            const stage2 = new Date(txDate);
            stage2.setDate(stage2.getDate() + 7);
            
            const stage3 = new Date(txDate);
            stage3.setDate(stage3.getDate() + 21);

            return {
                quote_name: q.name,
                created_on: txDate.toISOString().split('T')[0],
                stage_1_due: stage1.toISOString().split('T')[0],
                stage_2_due: stage2.toISOString().split('T')[0],
                stage_3_due: stage3.toISOString().split('T')[0],
                current_stage: 1,
                is_closed: false,
                manager_signoff_status: 'pending'
            };
        });

        // Use upsert with onConflict to avoid inserting duplicates if they already exist
        const { error: insertErr } = await supabase
            .from('omnis_quote_lifecycle')
            .upsert(lifecyclePayload, { onConflict: 'quote_name', ignoreDuplicates: true });

        if (insertErr) {
            console.error("Error inserting batch " + i + ":", insertErr);
        } else {
            initializedCount += batch.length;
            console.log("Processed " + initializedCount + "/" + quotes.length + " quotes...");
        }
    }
    
    console.log("Done initializing all quotes!");
}

initAllLifecycles();
