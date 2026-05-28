const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

/**
 * OMNIS CUSTOMER IMPORT SCRIPT
 * Migrates Frappe Customer database to Supabase gradually.
 * 
 * Usage:
 * 1. Edit the FRAPPE_API_KEY and FRAPPE_API_SECRET below.
 * 2. Run: node import_customers.js
 */

// Configuration
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc"; // Service Role Key

// --- USER ACTION REQUIRED: SET YOUR FRAPPE API KEYS ---
const FRAPPE_API_KEY = "73624aafe4cc8cc";
const FRAPPE_API_SECRET = "913259a7599a652";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Custom axios instance with security overrides
const frappe = axios.create({
    baseURL: 'https://salestrack.powerstar.co.zw/api/method',
    headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function importCustomers() {
    console.log("\n-------------------------------------------");
    console.log("🚀 OMNIS: Gradual Customer Migration Starting");
    console.log("-------------------------------------------");
    
    let start = 0;
    const page_length = 100;
    let finished = false;
    let totalImported = 0;

    if (FRAPPE_API_KEY === "YOUR_API_KEY" || FRAPPE_API_KEY === "") {
        console.error("❌ ERROR: Please edit this script and provide your FRAPPE_API_KEY and FRAPPE_API_SECRET.");
        console.log("Tip: You can generate these in Frappe User settings.");
        process.exit(1);
    }

    while (!finished) {
        process.stdout.write(`📡 Fetching batch ${start}... `);
        
        try {
            const res = await frappe.post('/powerstar_salestrack.omnis_dashboard.get_omnis_customers', { start, page_length });
            const customers = res.data.message?.data || [];

            if (!Array.isArray(customers) || customers.length === 0) {
                console.log("End of data reached.");
                finished = true;
                break;
            }

            // Map to Supabase format
            const mapped = customers.map(c => ({
                frappe_id: c.name || c.id,
                customer_name: c.customer_name || c.name,
                customer_group: c.customer_group,
                territory: c.territory,
                customer_type: c.customer_type,
                default_price_list: c.default_price_list
            }));

            // Push to Supabase
            const { error } = await supabase.from('customers').upsert(mapped);
            if (error) {
                console.log(`\n⚠️ Supabase Batch Error: ${error.message}`);
            }

            totalImported += customers.length;
            process.stdout.write(`✅ Success. Total: ${totalImported}\n`);

            if (customers.length < page_length) {
                finished = true;
            } else {
                start += page_length;
                // Sleep for 2 seconds to be gentle on server
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (e) {
            console.log("\n❌ Fatal Fetch Error:");
            if (e.response) {
                console.error(`   Status: ${e.response.status}`);
                console.error(`   Data: ${JSON.stringify(e.response.data)}`);
            } else {
                console.error(`   Message: ${e.message}`);
            }
            break;
        }
    }

    console.log("\n-------------------------------------------");
    console.log(`✨ MIGRATION COMPLETE!`);
    console.log(`📊 Total Imported: ${totalImported}`);
    console.log("-------------------------------------------\n");
}

importCustomers();
