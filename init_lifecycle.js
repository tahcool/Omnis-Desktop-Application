const { createClient } = require('@supabase/supabase-js');

// Using the same URL and Service Key as the edge functions
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function initLifecycle() {
    console.log("Fetching open quotes...");
    
    // Fetch quotes not Lost or Cancelled
    const { data: quotes, error: fetchErr } = await supabase
        .from('frappe_quotation')
        .select('name, transaction_date')
        .neq('status', 'Lost')
        .neq('status', 'Cancelled');

    if (fetchErr) {
        console.error("Fetch Error:", fetchErr);
        return;
    }

    console.log(`Found ${quotes.length} active quotes. Initializing lifecycle tracking...`);

    const records = quotes.map(q => {
        // Use 'transaction_date' timestamp, or fallback to now if missing
        const createdOn = new Date(q.transaction_date || new Date());
        
        const stage1Due = new Date(createdOn);
        stage1Due.setDate(stage1Due.getDate() + 3);
        
        const stage2Due = new Date(createdOn);
        stage2Due.setDate(stage2Due.getDate() + 7);
        
        const stage3Due = new Date(createdOn);
        stage3Due.setDate(stage3Due.getDate() + 21);

        return {
            quote_name: q.name,
            created_on: createdOn.toISOString(),
            stage_1_due: stage1Due.toISOString().split('T')[0],
            stage_2_due: stage2Due.toISOString().split('T')[0],
            stage_3_due: stage3Due.toISOString().split('T')[0],
            current_stage: 1,
            is_closed: false,
            manager_signoff_status: 'pending'
        };
    });

    // Upsert in batches of 100
    let successCount = 0;
    for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100);
        const { error: insertErr } = await supabase
            .from('omnis_quote_lifecycle')
            .upsert(batch, { onConflict: 'quote_name' });
            
        if (insertErr) {
            console.error("Batch Insert Error:", insertErr);
        } else {
            successCount += batch.length;
            console.log(`Initialized ${successCount}/${records.length} quotes...`);
        }
    }

    console.log("Initialization complete!");
}

initLifecycle();
