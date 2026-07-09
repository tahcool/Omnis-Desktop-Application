const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function initAllItems() {
    console.log("Fetching all items from Frappe...");
    try {
        const response = await axios.get('https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_quotations_with_items', {
            params: { page_length: 5000 }
        });

        const items = response.data.message.data.items || [];
        console.log(`Found ${items.length} items from Frappe.`);

        if (items.length === 0) {
            console.log("No items found to sync.");
            return;
        }

        const mappedItems = items.map(i => {
            const match = i.parent.match(/(SAL-QTN-\d+-\d+)/);
            const parentId = match ? match[0] : i.parent;
            return {
                parent: parentId,
                item_code: i.item_code,
                item_name: i.item_name,
                qty: parseFloat(i.qty || 0),
                rate: parseFloat(i.rate || 0),
                amount: parseFloat(i.amount || 0),
                brand: i.brand,
                item_group: i.item_group
            };
        });

        console.log("Emptying the existing quotation_items table in Supabase...");
        
        const parentNames = [...new Set(mappedItems.map(i => i.parent))];
        
        const batchSize = 100;
        for (let i = 0; i < parentNames.length; i += batchSize) {
            const batchParents = parentNames.slice(i, i + batchSize);
            const { error: delErr } = await supabase.from('quotation_items').delete().in('parent', batchParents);
            if (delErr) {
                console.error("Error deleting items for batch starting at " + i, delErr);
            }
        }
        console.log("Existing items deleted. Now inserting...");

        const insertBatchSize = 500;
        let insertedCount = 0;
        for (let i = 0; i < mappedItems.length; i += insertBatchSize) {
            const batchItems = mappedItems.slice(i, i + insertBatchSize);
            const { error: insErr } = await supabase.from('quotation_items').insert(batchItems);
            
            if (insErr) {
                console.error("Error inserting items at " + i, insErr);
            } else {
                insertedCount += batchItems.length;
                console.log(`Inserted ${insertedCount} / ${mappedItems.length} items...`);
            }
        }

        console.log("Done syncing all items!");

    } catch (err) {
        console.error("Critical error:", err.message);
    }
}

initAllItems();
