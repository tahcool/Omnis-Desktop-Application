const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/create_quotation_logic.js', 'utf-8');

const replacement = `            if (typeof resetQtnForm === 'function') resetQtnForm();
            if (typeof showOnly === 'function') showOnly(document.getElementById("view-quotations-list"));
            if (window.loadQuotationList) window.loadQuotationList();
            window.showQuotationOptions(quoteId, true);

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            if (submitBtn) submitBtn.innerHTML = originalText;
        }
    };

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
            const price = parseFloat(row.querySelector(".qq-item-price")?.value) || 0;
            if (code) {
                itemsToInsert.push({ item_code: code, rate: price, qty: 1 });
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

            if (insErr) throw new Error(insErr.message);

            const itemsData = itemsToInsert.map(it => ({ ...it, parent: quoteId }));
            const { error: itemErr } = await window.electron.invoke('supabase:query', {
                table: 'quotation_items',
                method: 'insert',
                params: { data: itemsData }
            });
            if (itemErr) throw new Error(itemErr.message);

            if (document.getElementById("qq-customer")) document.getElementById("qq-customer").value = "";
            if (document.getElementById("qq-title")) document.getElementById("qq-title").value = "";
            if (document.getElementById("qq-salesperson")) document.getElementById("qq-salesperson").value = "";

            const container = document.getElementById("qq-items-container");
            if (container) {
                container.innerHTML = \`<div class="qq-item-row" style="display:grid; grid-template-columns: 2fr 1fr auto; gap: 10px;">
                  <div class="suggest-container">
                    <input type="text" class="q-quick-input qq-item-code" placeholder="Item Code" style="width: 100%;" />
                    <div class="suggest-list hidden"></div>
                  </div>
                  <input type="number" class="q-quick-input qq-item-price" placeholder="Price ($)" style="width: 100%;" />
                  <button class="btn-danger" onclick="if(document.querySelectorAll('.qq-item-row').length > 1) this.parentElement.remove()" style="padding: 0 12px; border-radius: 8px; border:none; background:#fee2e2; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
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
        row.style.cssText = "display:grid; grid-template-columns: 2fr 1fr auto; gap: 10px;";
        row.innerHTML = \`<div class="suggest-container">
                <input type="text" class="q-quick-input qq-item-code" placeholder="Item Code" style="width: 100%;" />
                <div class="suggest-list hidden"></div>
            </div>
            <input type="number" class="q-quick-input qq-item-price" placeholder="Price ($)" style="width: 100%;" />
            <button class="btn-danger" onclick="if(document.querySelectorAll('.qq-item-row').length > 1) this.parentElement.remove()" style="padding: 0 12px; border-radius: 8px; border:none; background:#fee2e2; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>\`;
        container.appendChild(row);
        
        const input = row.querySelector('.qq-item-code');
        const suggestList = row.querySelector('.suggest-list');
        if (typeof setupSuggestions === 'function') {
            setupSuggestions(input, suggestList, 'items');
        }
    };
    
    window.wireQuickCreateItems = function() {
        const rows = document.querySelectorAll('.qq-item-row');
        rows.forEach(row => {
            const input = row.querySelector('.qq-item-code');
            const suggestList = row.querySelector('.suggest-list');
            if (input && suggestList && typeof setupSuggestions === 'function') {
                setupSuggestions(input, suggestList, 'items');
            }
        });
    };

    // --- HELPER: Suggestions ---
    function setupSuggestions(input, list, methodName, onSelect = null) {
        if (!input || !list) return;

        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), wait);
            };
        };

        const fetchSuggestions = async (val) => {`;

content = content.replace(/            };\r?\n        };\r?\n\r?\n        const fetchSuggestions = async \(val\) => {/, replacement);

fs.writeFileSync('systems/salestrack/create_quotation_logic.js', content);
