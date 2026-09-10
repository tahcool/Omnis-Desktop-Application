const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const dbPath = 'C:\\Users\\Administrator\\AppData\\Roaming\\omnis-desktop\\salestrack_cache.db';
if (!fs.existsSync(dbPath)) {
    console.error('Local cache database not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function migrate() {
    console.log('Fetching quotations from local SQLite cache...');
    
    // The table name is likely 'quotations' or we can check
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in local db:', tables.map(t => t.name).join(', '));
    
    if (!tables.find(t => t.name === 'quotations')) {
        console.error('quotations table not found in local db!');
        return;
    }

    const allQuotesRow = db.prepare("SELECT * FROM quotations").all();
    // In lib/database.js, data is often stored as JSON strings in a "data" column or full schema
    
    console.log(`Found ${allQuotesRow.length} rows in local quotations table.`);
    if (allQuotesRow.length === 0) return;

    // Map to Supabase schema
    const supabaseQuotes = allQuotesRow.map(row => {
        let q = row;
        // If data is JSON stored in a data column
        if (typeof row.data === 'string') {
            try {
                q = JSON.parse(row.data);
            } catch(e) {}
        }
        
        return {
            name: q.name || row.name,
            title: q.title || null,
            customer_name: q.customer_name || 'Unknown',
            transaction_date: q.transaction_date || null,
            sales_person: q.custom_sales_person || null,
            status: q.status || 'Draft',
            custom_next_follow_up_date: q.custom_next_follow_up_date || null,
            company: q.company || 'Machinery Exchange',
            notes: ''
        };
    });

    const chunkSize = 200;
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
        console.log(`Inserted/Upserted ${inserted}/${supabaseQuotes.length}`);
    }
    
    console.log('Migration of quotation headers completed successfully.');
}

migrate().catch(console.error);
