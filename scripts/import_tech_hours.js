/**
 * Import historical FT Technician Hour Logs from Frappe to Supabase.
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in environment variables.');
    process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Frappe API Config
const FRAPPE_URL = 'https://fleetrack.machinery-exchange.com';
const API_KEY = '07660480c74686c';
const API_SECRET = '82899cba0bfdc36';

async function run() {
    console.log('Fetching Hour Logs from Frappe...');
    const FIELDS = ['name', 'technician', 'date', 'productive', 'travel', 'admin', 'house_keeping', 'non_productive', 'creation', 'modified'];
    const PAGE = 500;
    let all = [];
    let start = 0;
    
    while (true) {
        process.stdout.write(`\r  Fetching: ${all.length} records...`);
        try {
            const res = await axios.get(`${FRAPPE_URL}/api/resource/FT%20Technician%20Hour%20Log`, {
                params: { limit_page_length: PAGE, limit_start: start, fields: JSON.stringify(FIELDS) },
                headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` },
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            const rows = res.data?.data || [];
            all.push(...rows);
            if (rows.length < PAGE) break;
            start += PAGE;
            await new Promise(r => setTimeout(r, 80));
        } catch (e) {
            console.error('Error fetching from frappe:', e.message);
            break;
        }
    }
    console.log(`\n✅ Fetched ${all.length} Hour Log records`);

    if (all.length === 0) {
        console.log('No records to import.');
        return;
    }

    // Map fields
    const mapped = all.map(r => ({
        frappe_name: r.name,
        technician: r.technician,
        date: r.date,
        productive: parseFloat(r.productive) || 0.0,
        travel: parseFloat(r.travel) || 0.0,
        admin: parseFloat(r.admin) || 0.0,
        house_keeping: parseFloat(r.house_keeping) || 0.0,
        non_productive: parseFloat(r.non_productive) || 0.0,
        created_at: r.creation ? new Date(r.creation).toISOString() : new Date().toISOString(),
        updated_at: r.modified ? new Date(r.modified).toISOString() : new Date().toISOString(),
    }));

    // Clear the table first (optional, if we want a fresh import)
    console.log('Clearing existing ft_technician_hour_log rows...');
    await sb.from('ft_technician_hour_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in batches of 500
    const BATCH = 500;
    let done = 0;
    const start2 = Date.now();
    for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        const { error } = await sb.from('ft_technician_hour_log').insert(batch);
        if (error) {
            console.error(`\n❌ Insert failed at batch ${i}:`, error.message);
            process.exit(1);
        }
        done += batch.length;
        const pct = ((done / mapped.length) * 100).toFixed(0);
        const elapsed = ((Date.now() - start2) / 1000).toFixed(0);
        process.stdout.write(`\r  ↑ ft_technician_hour_log: ${done}/${mapped.length} (${pct}%) — ${elapsed}s`);
    }

    // Verify
    const { count } = await sb.from('ft_technician_hour_log').select('*', { count: 'exact', head: true });
    console.log(`\n\n✅ Done! ft_technician_hour_log now has ${count} rows in Supabase`);
}

run().catch(e => { console.error('\n❌ Failed:', e.message); process.exit(1); });
