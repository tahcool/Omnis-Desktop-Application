const axios = require('axios');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const FRAPPE_TOKEN = 'token 73624aafe4cc8cc:21d3b98f10df277';
const SALESTRACK_IP = '102.207.50.172';
const SALESTRACK_DOMAIN = 'salestrack.powerstar.co.zw';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    lookup: (hostname, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (hostname === SALESTRACK_DOMAIN) {
            if (options.all) return callback(null, [{ address: SALESTRACK_IP, family: 4 }]);
            return callback(null, SALESTRACK_IP, 4);
        }
        require('dns').lookup(hostname, options, callback);
    }
});

async function frappeRequest(method, params) {
    try {
        const res = await axios({
            url: `https://${SALESTRACK_DOMAIN}/api/method/${method}`,
            method: 'GET',
            params,
            headers: {
                'Authorization': FRAPPE_TOKEN,
                'Host': SALESTRACK_DOMAIN,
                'Origin': `https://${SALESTRACK_DOMAIN}`,
                'Referer': `https://${SALESTRACK_DOMAIN}/app`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            httpsAgent,
            timeout: 30000
        });
        return res.data.message;
    } catch (err) {
        console.error(`Error ${method}: ${err.message}`);
        if (err.response) console.error(JSON.stringify(err.response.data));
        return null;
    }
}

async function migrate() {
    console.log('Starting Migration (Node.js)...');
    
    const { count } = await supabase.from('quotations').select('*', { count: 'exact', head: true });
    let start = count || 0;
    console.log(`Resuming from ${start}...`);
    
    const limit = 100;
    
    while (true) {
        console.log(`Fetching batch ${start}...`);
        const headers = await frappeRequest('frappe.client.get_list', {
            doctype: 'Quotation',
            fields: JSON.stringify([
                "name", "customer_name", "transaction_date", "grand_total", "status", 
                "company", "custom_sales_person", "territory", "customer_group", 
                "docstatus", "owner", "creation", "modified", "currency", "total_qty", "valid_till"
            ]),
            filters: JSON.stringify([["docstatus", "<", 2]]),
            order_by: 'creation asc',
            limit_start: start,
            limit_page_length: limit
        });
        
        if (!headers || headers.length === 0) break;
        
        const names = headers.map(h => h.name);
        const items = await frappeRequest('frappe.client.get_list', {
            doctype: 'Quotation Item',
            fields: JSON.stringify(["parent", "item_code", "item_name", "qty", "rate", "amount"]),
            filters: JSON.stringify([["parent", "in", names]]),
            limit_page_length: 2000
        }) || [];
        
        const itemCodes = [...new Set(items.map(i => i.item_code).filter(Boolean))];
        let itemMap = {};
        if (itemCodes.length > 0) {
            const meta = await frappeRequest('frappe.client.get_list', {
                doctype: 'Item',
                fields: JSON.stringify(["name", "brand", "item_group"]),
                filters: JSON.stringify([["name", "in", itemCodes]]),
                limit_page_length: itemCodes.length
            }) || [];
            meta.forEach(m => itemMap[m.name] = m);
        }
        
        // Prepare and Upsert
        const sbHeaders = headers.map(h => ({
            name: h.name,
            customer_name: h.customer_name,
            transaction_date: h.transaction_date,
            grand_total: parseFloat(h.grand_total || 0),
            status: h.status,
            company: h.company,
            custom_sales_person: h.custom_sales_person,
            territory: h.territory,
            customer_group: h.customer_group,
            docstatus: h.docstatus,
            owner: h.owner,
            creation: h.creation,
            modified: h.modified,
            currency: h.currency,
            total_qty: parseFloat(h.total_qty || 0),
            valid_till: h.valid_till
        }));
        
        const sbItems = items.map(i => ({
            parent: i.parent,
            item_code: i.item_code,
            item_name: i.item_name,
            qty: parseFloat(i.qty || 0),
            rate: parseFloat(i.rate || 0),
            amount: parseFloat(i.amount || 0),
            brand: itemMap[i.item_code]?.brand,
            item_group: itemMap[i.item_code]?.item_group
        }));
        
        await supabase.from('quotations').upsert(sbHeaders);
        if (sbItems.length > 0) await supabase.from('quotation_items').insert(sbItems);
        
        start += headers.length;
        console.log(`Migrated ${start} quotations...`);
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('Migration Finished!');
}

migrate();
