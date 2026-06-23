const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSP() {
    const { data } = await supabase.from('frappe_quotation').select('custom_sales_person');
    if (data) {
        const uniqueSP = [...new Set(data.map(d => d.custom_sales_person).filter(Boolean))];
        console.log("Unique Sales Persons:", uniqueSP);
    }
}
checkSP();
