const fs = require('fs');
const path = require('path');

const file = 'systems/salestrack/create_quotation_logic.js';
let code = fs.readFileSync(file, 'utf8');

// 1. Replace submitQuotation
const newSubmit = `
    window.submitQuotation = async function () {
        const submitBtn = document.getElementById("btn-submit-quotation");
        const originalText = submitBtn ? submitBtn.innerHTML : "Save";
        if (submitBtn) submitBtn.innerHTML = "<span>Saving...</span>";

        try {
            const data = {
                customer: document.getElementById("qtn-customer")?.value,
                company: document.getElementById("qtn-company")?.value,
                transaction_date: document.getElementById("qtn-date")?.value || new Date().toISOString().split('T')[0],
                valid_till: document.getElementById("qtn-valid-till")?.value,
                sales_person: document.getElementById("qtn-sales-person")?.value,
                bank_account: document.getElementById("qtn-bank")?.value,
                pfi_checked: document.getElementById("qtn-pfi")?.checked,
                delivery: document.getElementById("qtn-delivery")?.value,
                notes: document.getElementById("qtn-notes")?.value,
                items: []
            };

            const tbody = document.getElementById("qtn-items-body");
            if (tbody) {
                Array.from(tbody.children).forEach(row => {
                    const itemCode = row.querySelector(".item-code")?.value;
                    const qty = row.querySelector(".item-qty")?.value;
                    const rate = row.querySelector(".item-rate")?.value;

                    if (itemCode && qty) {
                        data.items.push({
                            item_code: itemCode,
                            item_name: itemCode, // Fallback
                            qty: parseFloat(qty),
                            rate: parseFloat(rate || 0),
                            amount: parseFloat(qty) * parseFloat(rate || 0)
                        });
                    }
                });
            }

            if (!data.customer) throw new Error("Customer is required");
            if (data.items.length === 0) throw new Error("At least one item is required");

            // Save to Supabase
            const yearStr = new Date().getFullYear().toString().slice(2);
            const prefix = \`SAL-QTN-\${yearStr}-\`;
            const seqRes = await window.electron.invoke('supabase:query', {
                table: 'quotations', method: 'select', 
                params: { columns: 'name', order: {column: 'creation', ascending: false}, limit: 1 }
            });
            
            let nextSeq = 1;
            if (seqRes.ok && seqRes.data && seqRes.data.length > 0) {
                 const last = seqRes.data[0].name;
                 const match = last.match(new RegExp(\`\${prefix}(\\\\d+)\`));
                 if (match) nextSeq = parseInt(match[1], 10) + 1;
            }
            const qtnName = \`\${prefix}\${nextSeq} -\`;

            let totalQty = 0;
            let grandTotal = 0;
            data.items.forEach(i => {
                totalQty += i.qty;
                grandTotal += i.amount;
            });

            const qDoc = {
                name: qtnName,
                customer_name: data.customer,
                company: data.company,
                transaction_date: data.transaction_date,
                valid_till: data.valid_till,
                custom_sales_person: data.sales_person,
                status: "Draft",
                docstatus: 0,
                grand_total: grandTotal,
                total_qty: totalQty,
                currency: 'USD',
                creation: new Date().toISOString(),
                owner: 'omnis@local'
            };

            const iRes = await window.electron.invoke('supabase:query', {
                table: 'quotations', method: 'insert', params: { data: qDoc }
            });
            if (iRes.ok === false) throw new Error(iRes.error);

            const qItems = data.items.map(i => ({
                parent: qtnName,
                item_code: i.item_code,
                item_name: i.item_name,
                qty: i.qty,
                rate: i.rate,
                amount: i.amount
            }));

            if (qItems.length > 0) {
                const iiRes = await window.electron.invoke('supabase:query', {
                    table: 'quotation_items', method: 'insert', params: { data: qItems }
                });
                if (iiRes.ok === false) throw new Error(iiRes.error);
            }

            resetQtnForm();
            showOnly(document.getElementById("view-quotations-list"));
            if (window.loadQuotationList) window.loadQuotationList();
            window.showQuotationOptions(qtnName, true);

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            if (submitBtn) submitBtn.innerHTML = originalText;
        }
    };
`;
code = code.replace(/window\.submitQuotation = async function \(\) \{[\s\S]*?\n    \};\n/m, newSubmit + '\n');

// 2. Replace submitQuickQuote
const newQuick = `
    async function submitQuickQuote() {
        const btn = document.getElementById("btn-qq-submit");
        const customer = document.getElementById("qq-customer")?.value;
        const title = document.getElementById("qq-title")?.value;
        const itemCode = document.getElementById("qq-item")?.value;
        const salesPerson = document.getElementById("qq-salesperson")?.value;

        if (!customer) { alert("Please select a customer"); return; }
        if (!itemCode) { alert("Please select an item"); return; }

        const originalText = btn ? btn.textContent : "Create Quote";
        if (btn) btn.textContent = "Creating...";

        try {
            // Save to Supabase
            const yearStr = new Date().getFullYear().toString().slice(2);
            const prefix = \`SAL-QTN-\${yearStr}-\`;
            const seqRes = await window.electron.invoke('supabase:query', {
                table: 'quotations', method: 'select', 
                params: { columns: 'name', order: {column: 'creation', ascending: false}, limit: 1 }
            });
            
            let nextSeq = 1;
            if (seqRes.ok && seqRes.data && seqRes.data.length > 0) {
                 const last = seqRes.data[0].name;
                 const match = last.match(new RegExp(\`\${prefix}(\\\\d+)\`));
                 if (match) nextSeq = parseInt(match[1], 10) + 1;
            }
            const qtnName = \`\${prefix}\${nextSeq} -\`;

            // Default quick quote rate to 0
            const qDoc = {
                name: qtnName,
                customer_name: customer,
                company: "Machinery Exchange",
                transaction_date: new Date().toISOString().split('T')[0],
                custom_sales_person: salesPerson,
                status: "Draft",
                docstatus: 0,
                grand_total: 0,
                total_qty: 1,
                currency: 'USD',
                creation: new Date().toISOString(),
                owner: 'omnis@local'
            };

            const iRes = await window.electron.invoke('supabase:query', {
                table: 'quotations', method: 'insert', params: { data: qDoc }
            });
            if (iRes.ok === false) throw new Error(iRes.error);

            const qItems = [{
                parent: qtnName,
                item_code: itemCode,
                item_name: title || itemCode,
                qty: 1,
                rate: 0,
                amount: 0
            }];

            const iiRes = await window.electron.invoke('supabase:query', {
                table: 'quotation_items', method: 'insert', params: { data: qItems }
            });
            if (iiRes.ok === false) throw new Error(iiRes.error);

            document.getElementById("qq-customer").value = "";
            document.getElementById("qq-title").value = "";
            document.getElementById("qq-item").value = "";
            if (document.getElementById("qq-salesperson")) {
                document.getElementById("qq-salesperson").value = "";
            }
            if (window.loadQuotationList) window.loadQuotationList();
            window.showQuotationOptions(qtnName, true);
        } catch (e) {
            alert("Quick Create Error: " + e.message);
        } finally {
            if (btn) btn.textContent = originalText;
        }
    }
`;
code = code.replace(/async function submitQuickQuote\(\) \{[\s\S]*?\n    \}\n/m, newQuick + '\n');

fs.writeFileSync(file, code);
console.log("Replaced submits");
