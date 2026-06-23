const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
const item = {
    "frappe_id": "test_id",
    "customer_name": "Test Name",
    "customer_type": "Company",
    "customer_group": "All Customer Groups",
    "tier": "Tier 1",
    "territory": "Zimbabwe",
    "default_price_list": ""
};
supabase.from('customers').insert(item).then(r => console.log(JSON.stringify(r))).catch(e => console.log(e));
