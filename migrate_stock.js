// Migrate Stock Pipeline data from Frappe to Supabase stock_inventory table
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = 'sb_secret_-00urMJzcz46YGozd7Pr5A_0FzVMDVI';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';

// Map OEM brand to company
function getCompany(oem) {
    const b = (oem || '').toLowerCase();
    if (b.includes('sino') || b.includes('shacman') || b.includes('foton')) return 'Sinopower';
    if (b.includes('hitachi') || b.includes('bobcat') || b.includes('shantui')) return 'Machinery Exchange';
    return 'Sinopower'; // Default
}

async function go() {
    // Login to Frappe
    const r = await fetch(`${FRAPPE_URL}/api/method/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'usr=administrator&pwd=6dx6B01yKw'
    });
    if (!r.ok) { console.log('Frappe login failed'); return; }
    const cookie = r.headers.get('set-cookie');

    // Fetch ALL stock pipeline records from Frappe
    const r2 = await fetch(`${FRAPPE_URL}/api/resource/Stock Pipeline?limit_page_length=0&fields=["*"]`, {
        headers: { Cookie: cookie }
    });
    const d2 = await r2.json();
    const frappeRecords = d2.data || [];
    console.log(`Fetched ${frappeRecords.length} records from Frappe.`);
    
    if (frappeRecords.length === 0) {
        console.log('No records to migrate.');
        return;
    }

    // Map Frappe fields to stock_inventory columns
    const rows = frappeRecords.map(fr => ({
        frappe_id: fr.name,
        company: getCompany(fr.oem),
        brand: fr.oem || null,
        model: fr.model || null,
        actual_qty: fr.quantity || 0,
        proposed_qty: fr.proposed_order || 0,
        prod_date: fr.production_completion || null,
        ship_date: fr.shipping_date || null,
        eta_durban: fr.eta_durban || null,
        eta_beira: fr.ted || null,
        eta_harare: fr.eta_harare || null,
        contract_name: fr.contract || null,
        is_preowned: false
    }));

    console.log(`Mapped ${rows.length} rows. Inserting...`);
    
    // Insert in batches
    const BATCH = 50;
    let inserted = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await sb.from('stock_inventory').upsert(batch, { onConflict: 'frappe_id' });
        if (error) {
            console.error(`Batch error:`, error.message);
            // Try individually
            for (const row of batch) {
                const { error: e2 } = await sb.from('stock_inventory').upsert(row, { onConflict: 'frappe_id' });
                if (e2) {
                    console.error(`  FAIL ${row.frappe_id} (${row.brand} ${row.model}):`, e2.message);
                    failed++;
                } else {
                    inserted++;
                }
            }
        } else {
            inserted += batch.length;
        }
        console.log(`Progress: ${inserted}/${rows.length} (${failed} failed)`);
    }
    
    // Verify
    const { count } = await sb.from('stock_inventory').select('*', { count: 'exact', head: true });
    console.log(`\nDone! stock_inventory now has ${count} records.`);
}

go().catch(e => console.error(e));
