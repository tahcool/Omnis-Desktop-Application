const fs = require('fs');
const file = 'systems/salestrack/create_quotation_logic.js';
let code = fs.readFileSync(file, 'utf8');

const regex = /const fetchSuggestions = async \(val\) => \{[\s\S]*?\} catch \(e\) \{ console\.error\("Suggest error", e\); \}\n        \};/m;

const newFetch = `const fetchSuggestions = async (val) => {
            if (!val || val.length < 1) {
                list.classList.add('hidden');
                return;
            }

            try {
                let data = [];
                if (methodName === 'customers' || methodName === "search_customer_for_omnis") {
                    const res = await window.electron.invoke('supabase:query', { table: 'customers', method: 'select', params: { filters: { customer_name: { op: 'ilike', value: \`%\${val}%\` } }, limit: 10 } });
                    if (res.data) data = res.data.map(c => ({ value: c.customer_name, description: c.customer_name }));
                } else if (methodName === 'items' || methodName === "search_item_for_omnis") {
                    const res = await window.electron.invoke('supabase:query', { table: 'products', method: 'select', params: { filters: { item_name: { op: 'ilike', value: \`%\${val}%\` } }, limit: 10 } });
                    if (res.data) data = res.data.map(i => ({ value: i.item_code, description: i.item_name, rate: i.rate || 0 }));
                } else if (methodName === 'sales_persons' || methodName === "search_sales_person_for_omnis") {
                    const res = await window.electron.invoke('supabase:query', { table: 'quotations', method: 'select', params: { columns: 'custom_sales_person', filters: { custom_sales_person: { op: 'ilike', value: \`%\${val}%\` } }, limit: 20 } });
                    if (res.data) {
                        const unique = [...new Set(res.data.map(s => s.custom_sales_person))].filter(x => !!x);
                        data = unique.map(u => ({ value: u, description: u }));
                    }
                }

                let listHtml = '';
                if (data.length > 0) {
                    listHtml += data.map(item => \`
                        <div class="suggest-item" data-val="\${item.value}" data-rate="\${item.rate || 0}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid #f1f5f9;">
                            <div style="font-weight:600; color:#334155;">\${item.description}</div>
                            \${item.details ? \`<div style="font-size:10px; color:#64748b;">\${item.details}</div>\` : ''}
                        </div>
                    \`).join('');
                }

                const exactMatch = data.find(d => d.value.toLowerCase() === val.toLowerCase());
                if (!exactMatch) {
                    listHtml += \`
                        <div class="suggest-item create-new" data-val="\${val}" style="padding: 8px; cursor: pointer; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                            <div style="font-weight:600; color:#3b82f6;">+ Create New "\${val}"</div>
                        </div>
                    \`;
                }

                if (listHtml !== '') {
                    list.innerHTML = listHtml;
                    list.classList.remove('hidden');

                    list.querySelectorAll('.suggest-item').forEach(el => {
                        el.onclick = async (e) => {
                            e.stopPropagation();
                            const selectedVal = el.getAttribute('data-val');
                            let item = data.find(i => i.value === selectedVal);
                            
                            if (el.classList.contains('create-new')) {
                                el.innerHTML = \`<div style="font-weight:600; color:#94a3b8;">Saving...</div>\`;
                                item = { value: selectedVal, description: selectedVal, rate: 0 };
                                if (methodName === 'customers' || methodName === "search_customer_for_omnis") {
                                    await window.electron.invoke('supabase:query', { table: 'customers', method: 'insert', params: { data: { customer_name: selectedVal, customer_group: 'Commercial', territory: 'Zimbabwe' } } });
                                } else if (methodName === 'items' || methodName === "search_item_for_omnis") {
                                    await window.electron.invoke('supabase:query', { table: 'products', method: 'insert', params: { data: { item_code: selectedVal, item_name: selectedVal, rate: 0 } } });
                                }
                            }

                            if (onSelect) {
                                onSelect(selectedVal, item);
                            } else {
                                input.value = selectedVal;
                            }
                            list.classList.add('hidden');
                        };
                    });
                } else {
                    list.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px; text-align:center;">No results</div>';
                    list.classList.remove('hidden');
                }
            } catch (e) { console.error("Suggest error", e); }
        };`;

code = code.replace(regex, newFetch);

// Also replace the calls if they still have methodName as string
code = code.replace(/"search_customer_for_omnis"/g, "'customers'");
code = code.replace(/"search_item_for_omnis"/g, "'items'");
code = code.replace(/"search_sales_person_for_omnis"/g, "'sales_persons'");

fs.writeFileSync(file, code);
console.log("Regex replaced successfully.");
