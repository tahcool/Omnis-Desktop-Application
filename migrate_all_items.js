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

async function fetchFrappeQuoteDoc(cookie, frappeName) {
    try {
        const res = await fetch(`${FRAPPE_URL}/api/resource/Quotation/${encodeURIComponent(frappeName)}`, {
            headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data;
    } catch (e) {
        return null;
    }
}

async function migrateItems() {
    const cookie = await loginFrappe();
    
    console.log('Fetching all Supabase quotations...');
    let supabaseQuotes = [];
    let start = 0;
    while (true) {
        const { data, error } = await sb.from('omnis_quotations').select('id, name').range(start, start + 999);
        if (error) throw error;
        supabaseQuotes = supabaseQuotes.concat(data);
        if (data.length < 1000) break;
        start += 1000;
    }
    
    console.log(`Found ${supabaseQuotes.length} quotations. Extracting IDs...`);
    const quotesToProcess = supabaseQuotes.map(sq => {
        return { id: sq.id, frappeId: sq.name };
    });

    // We will empty the existing items because we will re-migrate all of them
    console.log('Clearing old items table to ensure no duplicates...');
    await sb.from('omnis_quotation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const itemsToInsert = [];
    let processed = 0;
    const CONCURRENCY = 30; // 30 concurrent requests
    
    for (let i = 0; i < quotesToProcess.length; i += CONCURRENCY) {
        const batch = quotesToProcess.slice(i, i + CONCURRENCY);
        
        const promises = batch.map(async (q) => {
            const doc = await fetchFrappeQuoteDoc(cookie, q.frappeId);
            if (doc && doc.items) {
                for (const item of doc.items) {
                    itemsToInsert.push({
                        quotation_id: q.id,
                        item_code: item.item_code || 'UNKNOWN_ITEM',
                        qty: item.qty || 1,
                        rate: item.rate || 0,
                        amount: item.amount || 0
                    });
                }
            }
        });
        
        await Promise.all(promises);
        processed += batch.length;
        console.log(`Processed ${processed}/${quotesToProcess.length} quotes... Extracted ${itemsToInsert.length} items so far.`);
    }
    
    console.log(`Finished fetching items. Total items to insert: ${itemsToInsert.length}`);
    
    const chunkSize = 1000;
    let inserted = 0;
    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
        const { error } = await sb.from('omnis_quotation_items').insert(chunk);
        if (error) {
            console.error(`Error inserting chunk:`, error);
            break;
        }
        inserted += chunk.length;
        console.log(`Inserted ${inserted}/${itemsToInsert.length} items.`);
    }
    
    console.log('Item migration complete!');
}

migrateItems().catch(console.error);
