const fs = require('fs');

const jsFile = 'systems/salestrack/create_quotation_logic.js';
let jsCode = fs.readFileSync(jsFile, 'utf8');

const newSubmitLogic = `
    // Helper to generate Supabase ID
    async function generateQuoteId() {
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = \`SAL-QTN-\${year}-\`;
        // Find highest existing
        const { data } = await window.electron.invoke('supabase:query', {
            table: 'quotations',
            method: 'select',
            params: { columns: 'name', filters: { name: { op: 'ilike', value: \`\${prefix}%\` } }, order: { column: 'created_at', ascending: false }, limit: 1 }
        });
        
        let seq = 1;
        if (data && data.length > 0 && data[0].name) {
            const parts = data[0].name.split('-');
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) seq = lastNum + 1;
        }
        return \`\${prefix}\${String(seq).padStart(4, '0')}\`;
    }

    window.submitQuotation = async function () {
        const submitBtn = document.getElementById("btn-submit-quotation");
        const originalText = submitBtn ? submitBtn.innerHTML : "Save";
        if (submitBtn) submitBtn.innerHTML = "<span>Saving...</span>";

        try {
            const data = {
                customer: document.getElementById("qtn-customer")?.value,
                company: document.getElementById("qtn-company")?.value,
                transaction_date: document.getElementById("qtn-date")?.value,
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
                            qty: parseFloat(qty),
                            rate: parseFloat(rate || 0)
                        });
                    }
                });
            }

            if (!data.customer) throw new Error("Customer is required");
            if (data.items.length === 0) throw new Error("At least one item is required");

            const quoteId = await generateQuoteId();
            
            const qtnRecord = {
                name: quoteId,
                customer: data.customer,
                company: data.company,
                transaction_date: data.transaction_date,
                valid_till: data.valid_till,
                custom_sales_person: data.sales_person,
                notes: data.notes,
                status: 'Draft'
            };

            const { error: insErr } = await window.electron.invoke('supabase:query', {
                table: 'quotations',
                method: 'insert',
                params: { data: qtnRecord }
            });

            if (insErr) throw new Error(insErr.message);

            for (const item of data.items) {
                await window.electron.invoke('supabase:query', {
                    table: 'quotation_items',
                    method: 'insert',
                    params: { data: { parent: quoteId, item_code: item.item_code, qty: item.qty, rate: item.rate } }
                });
            }

            resetQtnForm();
            showOnly(document.getElementById("view-quotations-list"));
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
        const itemCode = document.getElementById("qq-item")?.value;
        const salesPerson = document.getElementById("qq-salesperson")?.value;

        if (!customer) { alert("Please select a customer"); return; }
        if (!itemCode) { alert("Please select an item"); return; }

        const originalText = btn ? btn.textContent : "Create Quote";
        if (btn) btn.textContent = "Creating...";

        try {
            const quoteId = await generateQuoteId();
            const qtnRecord = {
                name: quoteId,
                customer: customer,
                company: "Machinery Exchange",
                custom_sales_person: salesPerson,
                notes: title,
                status: 'Draft',
                transaction_date: new Date().toISOString().split('T')[0]
            };

            const { error: insErr } = await window.electron.invoke('supabase:query', {
                table: 'quotations',
                method: 'insert',
                params: { data: qtnRecord }
            });

            if (insErr) throw new Error(insErr.message);

            await window.electron.invoke('supabase:query', {
                table: 'quotation_items',
                method: 'insert',
                params: { data: { parent: quoteId, item_code: itemCode, qty: 1, rate: 0 } }
            });

            document.getElementById("qq-customer").value = "";
            document.getElementById("qq-title").value = "";
            document.getElementById("qq-item").value = "";
            if (document.getElementById("qq-salesperson")) {
                document.getElementById("qq-salesperson").value = "";
            }
            if (window.loadQuotationList) window.loadQuotationList();
            window.showQuotationOptions(quoteId, true);

        } catch (e) {
            alert("Quick Create Error: " + e.message);
        } finally {
            if (btn) btn.textContent = originalText;
        }
    }
`;

const regexJs = /window\.submitQuotation = async function \(\) \{[\s\S]*?\}\n    \}/;
jsCode = jsCode.replace(regexJs, newSubmitLogic);
fs.writeFileSync(jsFile, jsCode);


// --- Patch index.html loadQuotationList ---
const htmlFile = 'systems/salestrack/index.html';
let htmlCode = fs.readFileSync(htmlFile, 'utf8');

const newLoadList = `async function loadQuotationList(force = false) {
      try {
        const tbody = document.getElementById("quotations-list-body");
        if (tbody) tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 20px;'>Loading from Supabase...</td></tr>";

        const { data: quotes, error } = await window.electron.invoke('supabase:query', {
            table: 'quotations',
            method: 'select',
            params: { order: { column: 'created_at', ascending: false }, limit: 50 }
        });

        if (error) {
            console.error("Failed to load quotations:", error);
            if (tbody) tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; color:red;'>Error loading data</td></tr>";
            return;
        }

        renderQuotationsTable(quotes);
      } catch (e) {
        console.error("loadQuotationList error:", e);
      }
    }`;

// Since the loadQuotationList function is huge and uses window.frappeAPI, we'll try to find it via indexOf
const startLoad = htmlCode.indexOf('async function loadQuotationList(force = false) {');
const endLoad = htmlCode.indexOf('// ---- Quick Create Autocomplete Wiring ----', startLoad);
if (startLoad !== -1 && endLoad !== -1) {
    // The previous implementation is between startLoad and endLoad. We need to leave the // ---- comment
    const toReplace = htmlCode.substring(startLoad, endLoad);
    htmlCode = htmlCode.replace(toReplace, newLoadList + '\n\n    ');
    fs.writeFileSync(htmlFile, htmlCode);
} else {
    console.error("Could not replace loadQuotationList in index.html");
}

console.log("Migration complete!");
