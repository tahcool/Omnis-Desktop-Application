const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'systems/salestrack/create_quotation_logic.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix generateQuoteId
content = content.replace(
    /params: { columns: 'name', or: `name.ilike.\${prefix}%`, order: { column: 'creation', ascending: false }, limit: 1 }/,
    "params: { columns: 'name', or: `name.ilike.${prefix}%`, order: { column: 'name', ascending: false }, limit: 1 }"
);

// 2. Fix error handling in submitQuickQuote
content = content.replace(
    /if \(insErr\) throw new Error\(insErr\.message\);/,
    "if (insErr) throw new Error(insErr.message || JSON.stringify(insErr));"
);
content = content.replace(
    /if \(itemErr\) throw new Error\(itemErr\.message\);/,
    "if (itemErr) throw new Error(itemErr.message || JSON.stringify(itemErr));"
);

// 3. Add item_group fetching in showQuotationOptions
content = content.replace(
    /let items = iData \|\| \[\];/,
    `let items = iData || [];
            for (let i of items) {
                if (i.item_code && !i.item_group) {
                    try {
                        const { data: pData } = await window.electron.invoke('supabase:query', { table: 'products', method: 'select', params: { filters: { item_code: i.item_code }, limit: 1 } });
                        if (pData && pData.length > 0 && pData[0].item_group_name) {
                            i.item_group = pData[0].item_group_name;
                        }
                    } catch(e) {}
                }
            }`
);

// 4. Update renderQuotationHTML
content = content.replace(
    /let detectedBrands = new Set\(\);/,
    `const quoteDelivery = (items.length > 0 && items[0].custom_delivery) ? items[0].custom_delivery : 'Harare';
        const quoteWarranty = (items.length > 0 && items[0].custom_warranty) ? items[0].custom_warranty : '2000 hours or 1 year parts warranty';
        let detectedBrands = new Set();`
);

content = content.replace(
    /<td style="border: 1px solid #000; padding: 4px; text-align: center;">\$\{row\.custom_equipment_type \|\| 'Machine'\}<\/td>/,
    `<td style="border: 1px solid #000; padding: 4px; text-align: center;">\${row.item_group || row.custom_equipment_type || 'Machine'}</td>`
);

content = content.replace(
    /<tr><td><u>Quotation Ref No:<\/u><\/td><td>\$\{qtn\.name\}<\/td><\/tr>\s*<tr><td><u>Customer:<\/u><\/td><td>\$\{qtn\.customer_name \|\| qtn\.customer \|\| ''\}<\/td><\/tr>/,
    `<tr><td><u>Quotation Ref No:</u></td><td>\${qtn.name}</td></tr>
                \${qtn.title ? \`<tr><td><u>Title:</u></td><td>\${qtn.title}</td></tr>\` : ''}
                <tr><td><u>Customer:</u></td><td>\${qtn.customer_name || qtn.customer || ''}</td></tr>`
);

content = content.replace(
    /<td colspan="3" style="border: 1px solid #000; padding: 4px;"><u>Warranty<\/u> — 2000 hours or 1 year parts warranty<\/td>\s*<td colspan="3" style="border: 1px solid #000; padding: 4px;"><u>Delivery<\/u> — Harare<\/td>/,
    `<td colspan="3" style="border: 1px solid #000; padding: 4px;"><u>Warranty</u> — \${quoteWarranty}</td>
                        <td colspan="3" style="border: 1px solid #000; padding: 4px;"><u>Delivery</u> — \${quoteDelivery}</td>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done");
