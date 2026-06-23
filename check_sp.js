const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTables() {
    const { data: salesPersons, error: spErr } = await supabase.from('frappe_sales_person').select('*').limit(5);
    console.log("Sales Persons Error:", spErr?.message);
    if (salesPersons) {
        console.log("Sales Persons:", salesPersons);
    }
}
checkTables();
