const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase details
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Frappe details
const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';
const API_KEY = '73624aafe4cc8cc';
const API_SECRET = '2613b1d70488058';

async function migrate() {
    try {
        console.log("Fetching items from Frappe...");
        const res = await axios.get(`${FRAPPE_URL}/api/resource/Item?fields=["name","item_name","item_group","description","custom_spec_sheet","custom_warranty","lead_time_days"]&limit_page_length=5000`, {
            headers: {
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            }
        });

        const items = res.data.data;
        console.log(`Found ${items.length} items. Syncing to Supabase...`);

        let count = 0;
        for (const item of items) {
            let cleanDesc = item.description ? item.description.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n').trim() : "";
            const specSheet = item.custom_spec_sheet || null;
            const leadTime = item.lead_time_days ? item.lead_time_days.toString() : null;

            const { error } = await supabase
                .from('products')
                .update({ 
                    description: cleanDesc,
                    spec_sheet_url: specSheet,
                    lead_time: leadTime
                })
                .eq('item_code', item.name);

            if (error) {
                if (error.message.includes("description") || error.message.includes("lead_time")) {
                    console.error("FATAL ERROR: The columns 'description' and 'lead_time' do not exist in the Supabase 'products' table.");
                    console.error("Please add them as TEXT columns in your Supabase Dashboard, then re-run this script!");
                    return;
                }
                console.error(`Error updating ${item.name}:`, error.message);
            } else {
                count++;
            }
        }
        console.log(`Successfully synced ${count} items to Supabase products!`);
    } catch(err) {
        console.error("Migration error:", err.response ? err.response.data : err.message);
    }
}

migrate();
