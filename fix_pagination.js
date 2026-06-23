const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `            // Fetch Lifecycle quotes
            let lifecycleRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_quote_lifecycle',
                params: {
                    columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date, company)',
                    limit: 5000
                }
            });
            let allQuotes = lifecycleRes.data || [];`;

const replacementStr = `            // Fetch Lifecycle quotes (Paginated to bypass 1000 row limit)
            let allQuotes = [];
            let start = 0;
            const pageSize = 1000;
            while (true) {
                let lifecycleRes = await window.electron.invoke('supabase:query', {
                    method: 'select',
                    table: 'omnis_quote_lifecycle',
                    params: {
                        columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date, company)',
                        range: { from: start, to: start + pageSize - 1 }
                    }
                });
                
                let chunk = lifecycleRes.data || [];
                allQuotes = allQuotes.concat(chunk);
                if (chunk.length < pageSize) break;
                start += pageSize;
            }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log("Updated pagination in openCommandCenter");
