const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSP() {
    const { data } = await supabase.from('frappe_quotation').select('custom_sales_person');
    if (data) {
        const uniqueSP = [...new Set(data.map(d => d.custom_sales_person).filter(Boolean))];
        console.log("Unique Sales Persons:", uniqueSP);
    }
}
checkSP();
