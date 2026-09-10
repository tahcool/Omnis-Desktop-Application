const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
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

async function fetchFrappeQuotesList(cookie) {
    let allQuotes = [];
    let start = 0;
    while (true) {
        const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
            method: 'POST',
            headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doctype: 'Quotation',
                fields: ['name'],
                limit_start: start,
                limit_page_length: 500
            })
        });
        const data = await res.json();
        if (!data.message || data.message.length === 0) break;
        allQuotes = allQuotes.concat(data.message);
        start += 500;
        console.log(`Fetched ${allQuotes.length} quotes from Frappe...`);
    }
    return allQuotes;
}

async function fetchFrappeQuoteDoc(cookie, frappeId) {
    const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get`, {
        method: 'POST',
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctype: 'Quotation', name: frappeId })
    });
    const data = await res.json();
    return data.message;
}

async function migrate() {
    console.log('Logging into Frappe...');
    const cookie = await loginFrappe();
    
    console.log('Fetching all Supabase quotations...');
    const { data: supabaseQuotes, error } = await sb.from('omnis_quotations').select('id, name');
    if (error) throw error;
    console.log(`Found ${supabaseQuotes.length} quotations in Supabase.`);

    console.log('Fetching all Frappe quotation names...');
    const frappeList = await fetchFrappeQuotesList(cookie);
    
    // Create a mapping from short name to full Frappe ID
    // Example: "SAL-QTN-26-4159" -> "Delta Gold Zimbabwe SAL-QTN-26-4159 -"
    const frappeNameMap = {};
    for (const f of frappeList) {
        // Find the "SAL-QTN-..." part
        const match = f.name.match(/(SAL-QTN-[0-9\-A-Za-z]+)/);
        if (match) {
            frappeNameMap[match[1]] = f.name;
        } else {
            // If the name is exactly the ID
            frappeNameMap[f.name] = f.name;
        }
    }

    let itemsToInsert = [];
    let processed = 0;
    let missingInFrappe = 0;

    for (const sq of supabaseQuotes) {
        let shortName = sq.name; // e.g. SAL-QTN-26-4159
        const sqMatch = shortName.match(/(SAL-QTN-[0-9\-A-Za-z]+)/);
        if (sqMatch) {
            shortName = sqMatch[1];
        }
        
        const frappeId = frappeNameMap[shortName];
        
        if (!frappeId) {
            console.log(`[Warning] No matching Frappe ID found for ${shortName}`);
            missingInFrappe++;
            continue;
        }

        try {
            const doc = await fetchFrappeQuoteDoc(cookie, frappeId);
            if (!doc || !doc.items) continue;

            for (const item of doc.items) {
                itemsToInsert.push({
                    quotation_id: sq.id,
                    item_code: item.item_code,
                    qty: item.qty || 1,
                    rate: item.rate || 0,
                    amount: item.amount || 0
                });
            }
        } catch (err) {
            console.error(`Error fetching document ${frappeId}:`, err.message);
        }

        processed++;
        if (processed % 10 === 0) console.log(`Processed ${processed}/${supabaseQuotes.length} quotes...`);
    }

    console.log(`\nFinished fetching items. Total items to insert: ${itemsToInsert.length}`);
    console.log(`Quotes missing in Frappe: ${missingInFrappe}`);

    if (itemsToInsert.length > 0) {
        // Chunk inserts
        const chunkSize = 200;
        let inserted = 0;
        
        // Clear old items to prevent duplicates if ran multiple times
        // We only clear items for quotes that we are migrating
        const quoteIds = [...new Set(itemsToInsert.map(i => i.quotation_id))];
        
        console.log('Clearing old items for these quotes...');
        for (let i = 0; i < quoteIds.length; i += 50) {
            const chunkIds = quoteIds.slice(i, i + 50);
            await sb.from('omnis_quotation_items').delete().in('quotation_id', chunkIds);
        }

        console.log('Inserting new items...');
        for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
            const chunk = itemsToInsert.slice(i, i + chunkSize);
            const { error } = await sb.from('omnis_quotation_items').insert(chunk);
            if (error) {
                console.error(`Error inserting chunk ${i}:`, error);
                break;
            }
            inserted += chunk.length;
            console.log(`Inserted ${inserted}/${itemsToInsert.length} items`);
        }
        console.log('Migration completed successfully!');
    }
}

migrate().catch(console.error);
