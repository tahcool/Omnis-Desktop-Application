const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';

async function loginFrappe() {
    const res = await fetch(`${FRAPPE_URL}/api/method/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'usr=administrator&pwd=6dx6B01yKw'
    });
    if (!res.ok) throw new Error('Login failed');
    return res.headers.get('set-cookie');
}

async function migrate() {
    const cookie = await loginFrappe();
    console.log('Fetching all quotations from Frappe...');
    let allQuotes = [];
    let start = 0;
    
    while (true) {
        const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doctype: 'Quotation',
                fields: ['name', 'title', 'customer_name', 'transaction_date', 'custom_sales_person', 'status', 'custom_next_follow_up_date', 'company'],
                limit_start: start,
                limit_page_length: 1000
            })
        });
        
        const data = await res.json();
        const records = data.message || [];
        allQuotes = allQuotes.concat(records);
        console.log(`Fetched ${allQuotes.length} quotes...`);
        
        if (records.length < 1000) break;
        start += 1000;
    }
    
    console.log(`Fetched ${allQuotes.length} total quotations. Upserting into Supabase...`);
    
    // Map to Supabase schema
    const supabaseQuotes = allQuotes.map(q => ({
        name: q.name,
        title: q.title || null,
        customer_name: q.customer_name || 'Unknown',
        transaction_date: q.transaction_date || null,
        sales_person: q.custom_sales_person || null,
        status: q.status || 'Draft',
        custom_next_follow_up_date: q.custom_next_follow_up_date || null,
        company: q.company || 'Machinery Exchange',
        notes: ''
    }));

    const chunkSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < supabaseQuotes.length; i += chunkSize) {
        const chunk = supabaseQuotes.slice(i, i + chunkSize);
        
        const { data, error } = await sb.from('omnis_quotations')
            .upsert(chunk, { onConflict: 'name', ignoreDuplicates: false })
            .select('name');
            
        if (error) {
            console.error(`Error inserting chunk ${i}:`, error);
            break;
        }
        
        inserted += (data ? data.length : 0);
        console.log(`Upserted ${inserted}/${supabaseQuotes.length}`);
    }
    console.log('Done migrating headers!');
}

migrate().catch(console.error);
