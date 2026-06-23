const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `            const q = res.data[0];
            const fq = q.frappe_quotation;`;

const replacementStr = `            const q = res.data[0];
            const fq = q.frappe_quotation;
            
            // Fetch quotation items
            const itemsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'quotation_items',
                params: {
                    columns: 'item_code, item_name, qty',
                    filters: { parent: quoteName }
                }
            });
            const items = itemsRes.data || [];
            
            let itemsHtml = '';
            if (items.length > 0) {
                itemsHtml = \`
                <div style="margin-top:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:8px;"><i class="fas fa-box-open" style="margin-right:4px;"></i> Items Quoted (\${items.length})</div>
                    <ul style="margin:0; padding-left:20px; font-size:12px; color:#334155;">
                        \${items.map(i => \`<li style="margin-bottom:4px;"><strong>\${i.qty}x</strong> \${i.item_code} \${i.item_name ? \` - \${i.item_name}\` : ''}</li>\`).join('')}
                    </ul>
                </div>
                \`;
            } else {
                itemsHtml = \`<div style="margin-top:16px; font-size:12px; color:#94a3b8; font-style:italic;">No items found for this quotation.</div>\`;
            }`;

content = content.replace(targetStr, replacementStr);

const targetHtmlStr = `                    <div style="margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px;">
                        <div style="font-size:20px; font-weight:800; color:#0f172a;">\${quoteName}</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px;">Customer: <strong>\${fq ? fq.customer_name : 'Unknown'}</strong> | Rep: <strong>\${fq ? fq.custom_sales_person : 'Unknown'}</strong></div>
                    </div>`;

const replacementHtmlStr = `                    <div style="margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px;">
                        <div style="font-size:20px; font-weight:800; color:#0f172a;">\${quoteName}</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px;">Customer: <strong>\${fq ? fq.customer_name : 'Unknown'}</strong> | Rep: <strong>\${fq ? fq.custom_sales_person : 'Unknown'}</strong></div>
                        \${itemsHtml}
                    </div>`;

content = content.replace(targetHtmlStr, replacementHtmlStr);

fs.writeFileSync(file, content);
console.log("Injected items logic!");
