const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixQuotations() {
    console.log("Fetching all quotations and items from Frappe...");
    try {
        const response = await axios.get('https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_quotations_with_items', {
            params: { page_length: 5000 }
        });

        const { headers, items } = response.data.message.data;
        console.log(`Found ${headers.length} headers and ${items.length} items.`);

        const mappedHeaders = headers.map(q => {
            const match = q.name.match(/(SAL-QTN-\d+-\d+)/);
            return {
                name: match ? match[0] : q.name,
                customer_name: q.customer_name,
                transaction_date: q.transaction_date,
                grand_total: parseFloat(q.grand_total || 0),
                status: q.status,
                company: q.company,
                custom_sales_person: q.custom_sales_person,
                territory: q.territory,
                customer_group: q.customer_group,
                docstatus: q.docstatus,
                owner: q.owner,
                creation: q.creation,
                modified: q.modified,
                currency: q.currency,
                total_qty: parseFloat(q.total_qty || 0),
                valid_till: q.valid_till
            };
        });

        const mappedItems = items.map(i => {
            const match = i.parent.match(/(SAL-QTN-\d+-\d+)/);
            return {
                parent: match ? match[0] : i.parent,
                item_code: i.item_code,
                item_name: i.item_name,
                qty: parseFloat(i.qty || 0),
                rate: parseFloat(i.rate || 0),
                amount: parseFloat(i.amount || 0),
                brand: i.brand,
                item_group: i.item_group
            };
        });

        console.log("Deleting old quotation_items...");
        // Delete all items first to avoid foreign key violations
        await supabase.from('quotation_items').delete().neq('parent', 'fake_value_to_delete_all');
        
        console.log("Deleting old quotations...");
        await supabase.from('quotations').delete().neq('name', 'fake_value_to_delete_all');

        console.log("Inserting headers...");
        const hBatchSize = 500;
        let hCount = 0;
        for (let i = 0; i < mappedHeaders.length; i += hBatchSize) {
            const batch = mappedHeaders.slice(i, i + hBatchSize);
            const { error: insErr } = await supabase.from('quotations').insert(batch);
            if (insErr) console.error("Error inserting headers at " + i, insErr);
            else {
                hCount += batch.length;
                console.log(`Inserted ${hCount} headers...`);
            }
        }

        console.log("Inserting items...");
        const iBatchSize = 500;
        let iCount = 0;
        for (let i = 0; i < mappedItems.length; i += iBatchSize) {
            const batch = mappedItems.slice(i, i + iBatchSize);
            const { error: insErr } = await supabase.from('quotation_items').insert(batch);
            if (insErr) console.error("Error inserting items at " + i, insErr);
            else {
                iCount += batch.length;
                console.log(`Inserted ${iCount} items...`);
            }
        }

        console.log("Done fixing all quotations and items!");

    } catch (err) {
        console.error("Critical error:", err.message);
    }
}

fixQuotations();
