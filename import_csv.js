const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

const csvPath = 'C:\\\\Users\\\\Administrator\\\\Downloads\\\\Quotation (1).csv';
const content = fs.readFileSync(csvPath, 'utf8');

// Quick and dirty CSV parser for the Frappe format
let rows = [];
let currentRow = [];
let currentCell = '';
let inQuotes = false;

for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
        if (inQuotes && content[i+1] === '"') {
            currentCell += '"';
            i++;
        } else {
            inQuotes = !inQuotes;
        }
    } else if (c === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && content[i+1] === '\n') {
            i++;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
    } else {
        currentCell += c;
    }
}
if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
}

console.log("Parsed rows:", rows.length);

let items_to_insert = [];
let parent_id = "";

for (let i = 21; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    
    if (row[1].trim() !== "") {
        parent_id = row[1].trim();
    }
    
    if (row.length > 109) {
        let item_name = row[87].trim();
        let item_code = row[93].trim();
        let qty_str = row[88].trim();
        let description = row[96].trim();
        let rate_str = row[107].trim();
        let amount_str = row[109].trim();
        
        if (item_name || item_code) {
            items_to_insert.push({
                parent: parent_id,
                item_code: item_code,
                item_name: item_name,
                qty: parseFloat(qty_str) || 0,
                rate: parseFloat(rate_str) || 0,
                amount: parseFloat(amount_str) || 0
            });
        }
    }
}

console.log(`Found ${items_to_insert.length} items to insert.`);

async function run() {
    let batchSize = 500;
    for (let i = 0; i < items_to_insert.length; i += batchSize) {
        let batch = items_to_insert.slice(i, i + batchSize);
        console.log(`Inserting batch ${i} to ${i+batch.length}...`);
        const { data, error } = await supabase.from('quotation_items').insert(batch);
        if (error) {
            console.error("Batch error:", error.message);
            // Insert 1 by 1
            for (let item of batch) {
                const res = await supabase.from('quotation_items').insert(item);
                if (res.error) console.log("Single error:", res.error.message);
            }
        }
    }
    console.log("Done!");
}

run();
