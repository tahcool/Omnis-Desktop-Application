const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

supabase.from('omnis_quote_lifecycle').select('*, frappe_quotation(name, custom_sales_person)').limit(1).then(r => console.log(JSON.stringify(r))).catch(console.error);
