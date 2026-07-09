const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function fix() {
    const sql = `
        ALTER TABLE public.omnis_tracking_orders 
        ADD COLUMN IF NOT EXISTS linked_sale_name TEXT,
        ADD COLUMN IF NOT EXISTS brand TEXT,
        ADD COLUMN IF NOT EXISTS model TEXT,
        ADD COLUMN IF NOT EXISTS order_date DATE,
        ADD COLUMN IF NOT EXISTS committed_lead_time TEXT,
        ADD COLUMN IF NOT EXISTS revised_handover DATE;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log("Result:", data, error);
}
fix();
