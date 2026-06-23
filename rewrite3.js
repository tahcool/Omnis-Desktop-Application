const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'systems/salestrack/create_quotation_logic.js');
let content = fs.readFileSync(filePath, 'utf8');

const newQuickCreate = `
    // ⚡ QUICK CREATE LOGIC
    async function submitQuickQuote() {
        const btn = document.getElementById("btn-qq-submit");
        const customer = document.getElementById("qq-customer")?.value;
        const title = document.getElementById("qq-title")?.value;
        const salesPerson = document.getElementById("qq-salesperson")?.value;

        if (!customer) { alert("Please select a customer"); return; }

        const itemRows = document.querySelectorAll(".qq-item-row");
        const itemsToInsert = [];
        for (let row of itemRows) {
            const code = row.querySelector(".qq-item-code")?.value?.trim();
            const qty = parseFloat(row.querySelector(".qq-item-qty")?.value) || 1;
            const price = parseFloat(row.querySelector(".qq-item-price")?.value) || 0;
            const leadtime = row.querySelector(".qq-item-leadtime")?.value?.trim() || '';
            const delivery = row.querySelector(".qq-item-delivery")?.value?.trim() || '';
            const warranty = row.querySelector(".qq-item-warranty")?.value?.trim() || '';
            if (code) {
                itemsToInsert.push({ 
                    item_code: code, 
                    rate: price, 
                    qty: qty, 
                    custom_lead_time: leadtime,
                    custom_delivery: delivery,
                    custom_warranty: warranty
                });
            }
        }

        if (itemsToInsert.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        const originalText = btn ? btn.textContent : "Create Quote";
        if (btn) btn.textContent = "Creating...";

        try {
            const quoteId = await generateQuoteId();
            const qtnRecord = {
                name: quoteId,
                customer_name: customer,
                company: "Machinery Exchange",
                custom_sales_person: salesPerson,
                status: 'Draft',
                transaction_date: new Date().toISOString().split('T')[0]
            };
            if (title) qtnRecord.title = title;

            const { error: insErr } = await window.electron.invoke('supabase:query', {
                table: 'quotations',
                method: 'insert',
                params: { data: qtnRecord }
            });

            if (insErr) throw new Error(insErr.message || JSON.stringify(insErr));

            const itemsData = itemsToInsert.map(it => ({ ...it, parent: quoteId }));
            const { error: itemErr } = await window.electron.invoke('supabase:query', {
                table: 'quotation_items',
                method: 'insert',
                params: { data: itemsData }
            });
            if (itemErr) throw new Error(itemErr.message || JSON.stringify(itemErr));

            if (document.getElementById("qq-customer")) document.getElementById("qq-customer").value = "";
            if (document.getElementById("qq-title")) document.getElementById("qq-title").value = "";
            if (document.getElementById("qq-salesperson")) document.getElementById("qq-salesperson").value = "";

            const container = document.getElementById("qq-items-container");
            if (container) {
                container.innerHTML = \`<div class="qq-item-row" style="display:grid; grid-template-columns: 1fr 60px 100px 110px 110px 120px 40px; gap: 8px;">
                  <div class="suggest-container">
                    <input type="text" class="q-quick-input qq-item-code" placeholder="Item Code" style="width: 100%; box-sizing: border-box;" />
                    <div class="suggest-list hidden"></div>
                  </div>
                  <input type="number" class="q-quick-input qq-item-qty" placeholder="Qty" value="1" style="width: 100%; box-sizing: border-box;" />
                  <input type="number" class="q-quick-input qq-item-price" placeholder="Price ($)" style="width: 100%; box-sizing: border-box;" />
                  <input type="text" class="q-quick-input qq-item-leadtime" placeholder="Lead Time" style="width: 100%; box-sizing: border-box;" />
                  <input type="text" class="q-quick-input qq-item-delivery" placeholder="Delivery" style="width: 100%; box-sizing: border-box;" />
                  <input type="text" class="q-quick-input qq-item-warranty" placeholder="Warranty" style="width: 100%; box-sizing: border-box;" />
                  <button class="btn-danger" onclick="if(document.querySelectorAll('.qq-item-row').length > 1) this.parentElement.remove()" style="padding: 0; display:flex; justify-content:center; align-items:center; border-radius: 8px; border:none; background:#fee2e2; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>\`;
                if (window.wireQuickCreateItems) window.wireQuickCreateItems();
            }

            if (window.loadQuotationList) window.loadQuotationList();
            window.showQuotationOptions(quoteId, true);

        } catch (e) {
            alert("Quick Create Error: " + e.message);
        } finally {
            if (btn) btn.textContent = originalText;
        }
    }

    window.addQuickQuoteItemRow = function() {
        const container = document.getElementById("qq-items-container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "qq-item-row";
        row.style.cssText = "display:grid; grid-template-columns: 1fr 60px 100px 110px 110px 120px 40px; gap: 8px; margin-top: 8px;";
        row.innerHTML = \`<div class="suggest-container">
                <input type="text" class="q-quick-input qq-item-code" placeholder="Item Code" style="width: 100%; box-sizing: border-box;" />
                <div class="suggest-list hidden"></div>
            </div>
            <input type="number" class="q-quick-input qq-item-qty" placeholder="Qty" value="1" style="width: 100%; box-sizing: border-box;" />
            <input type="number" class="q-quick-input qq-item-price" placeholder="Price ($)" style="width: 100%; box-sizing: border-box;" />
            <input type="text" class="q-quick-input qq-item-leadtime" placeholder="Lead Time" style="width: 100%; box-sizing: border-box;" />
            <input type="text" class="q-quick-input qq-item-delivery" placeholder="Delivery" style="width: 100%; box-sizing: border-box;" />
            <input type="text" class="q-quick-input qq-item-warranty" placeholder="Warranty" style="width: 100%; box-sizing: border-box;" />
            <button class="btn-danger" onclick="if(document.querySelectorAll('.qq-item-row').length > 1) this.parentElement.remove()" style="padding: 0; display:flex; justify-content:center; align-items:center; border-radius: 8px; border:none; background:#fee2e2; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>\`;
        container.appendChild(row);
        if (window.wireQuickCreateItems) window.wireQuickCreateItems();
    };

    window.wireQuickCreateItems = function() {
        // Customer wiring
        const custInp = document.getElementById('qq-customer');
        const custList = document.getElementById('qq-customer-list');
        if (custInp && custList && !custInp.dataset.wired) {
            custInp.dataset.wired = "true";
            setupSuggestions(custInp, custList, 'customers', (val, item) => {
                custInp.value = val;
            });
        }

        // Sales Person wiring
        const spInp = document.getElementById('qq-salesperson');
        const spList = document.getElementById('qq-salesperson-list');
        if (spInp && spList && !spInp.dataset.wired) {
            spInp.dataset.wired = "true";
            setupSuggestions(spInp, spList, 'search_sales_person', (val, item) => {
                spInp.value = val;
            });
        }

        // Items wiring
        const rows = document.querySelectorAll('.qq-item-row');
        rows.forEach(r => {
            const input = r.querySelector('.qq-item-code');
            const list = r.querySelector('.suggest-list');
            if (input && list && !input.dataset.wired) {
                input.dataset.wired = "true";
                setupSuggestions(input, list, 'products', async (val, item) => {
                    input.value = val;
                    const priceInp = r.querySelector('.qq-item-price');
                    if (priceInp && item && item.rate) {
                        priceInp.value = item.rate;
                    } else {
                        // fetch rate from products if not provided directly in suggestion
                        try {
                            const { data: pData } = await window.electron.invoke('supabase:query', { table: 'products', method: 'select', params: { filters: { item_code: val }, limit: 1 } });
                            if (pData && pData.length > 0 && priceInp) {
                                priceInp.value = pData[0].standard_rate || pData[0].rate || 0;
                            }
                        } catch(e) {}
                    }
                });
            }
        });
    };
`;

// Extract old submitQuickQuote
const oldStart = content.indexOf('// ⚡ QUICK CREATE LOGIC');
const oldEnd = content.indexOf('// --- HELPER: Suggestions ---');

if (oldStart !== -1 && oldEnd !== -1) {
    const oldSegment = content.substring(oldStart, oldEnd);
    content = content.replace(oldSegment, newQuickCreate + "\n\n    ");
} else {
    console.log("Could not find delimiters");
}

fs.writeFileSync(filePath, content, 'utf8');

// Wait, the setupSuggestions function in the existing logic fetches from frappe using callFrappeSequenced, but the new one was adapted to fetch from products directly for items.
// Let's modify setupSuggestions to also handle 'products'
content = fs.readFileSync(filePath, 'utf8');
if (!content.includes("if (methodName === 'products')")) {
    const suggestBlock = `                if (methodName === 'products') {
                    const params = { limit: 20 };
                    if (val) params.or = \`item_code.ilike.%\${val}%,item_name.ilike.%\${val}%\`;
                    const res = await window.electron.invoke('supabase:query', { table: 'products', method: 'select', params });
                    if (res.data) data = res.data.map(p => ({ value: p.item_code, description: p.item_name || p.item_code, rate: p.standard_rate || p.rate || 0 }));
                } else if (methodName === 'customers' || methodName === "search_customer_for_omnis") {`;
    
    content = content.replace(/if \(methodName === 'customers' \|\| methodName === "search_customer_for_omnis"\) \{/, suggestBlock);
    fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Rewrite done");
