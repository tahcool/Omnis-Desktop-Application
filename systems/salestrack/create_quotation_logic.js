
(function () {
    // Expose reset function
    window.resetQtnForm = function () {
        const form = document.getElementById("qtn-form");
        if (form) form.reset();
        const tbody = document.getElementById("qtn-items-body");
        if (tbody) tbody.innerHTML = "";

        const titleDisplay = document.getElementById("qtn-title-display");
        if (titleDisplay) titleDisplay.value = "";

        // Add one empty row and calc
        if (window.addQuotationItemRow) window.addQuotationItemRow();
        if (window.calculateQuotationTotals) window.calculateQuotationTotals();
    };

    // Expose init function globally
    window.initCreateQuotation = function () {
        console.log("Initializing Create Quotation View...");

        // Set Default Dates
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById("qtn-date");
        const validTillInput = document.getElementById("qtn-valid-till");

        if (dateInput && !dateInput.value) dateInput.value = today;
        if (validTillInput && !validTillInput.value) {
            // Default 30 days validity?
            const d = new Date();
            d.setDate(d.getDate() + 30);
            validTillInput.value = d.toISOString().split('T')[0];
        }

        // Setup Event Listeners
        const addRowBtn = document.getElementById("qtn-add-row-btn");
        if (addRowBtn) addRowBtn.onclick = addQuotationItemRow;

        const submitBtn = document.getElementById("btn-submit-quotation");
        if (submitBtn) submitBtn.onclick = submitQuotation;

        const cancelBtn = document.getElementById("btn-cancel-quotation");
        if (cancelBtn) cancelBtn.onclick = () => showOnly(document.getElementById("view-quotations-list"));

        // Initial Row
        const tbody = document.getElementById("qtn-items-body");
        if (tbody && tbody.children.length === 0) {
            addQuotationItemRow();
        }

        // Calculate Totals setup
        const table = document.getElementById("qtn-items-table");
        if (table) table.addEventListener("input", calculateQuotationTotals);

        // SUGGESTIONS: Customer
        setupSuggestions(
            document.getElementById("qtn-customer"),
            document.getElementById("qtn-customer-suggest"),
            "search_customer_for_omnis",
            (val, item) => {
                document.getElementById("qtn-customer").value = item.value;
                const nameInp = document.getElementById("qtn-customer-name");
                if (nameInp) nameInp.value = item.description;
            }
        );

        // SUGGESTIONS: Sales Person
        setupSuggestions(
            document.getElementById("qtn-sales-person"),
            document.getElementById("qtn-salesperson-suggest"),
            "search_sales_person_for_omnis"
        );
    };

    window.addQuotationItemRow = function () {
        const tbody = document.getElementById("qtn-items-body");
        if (!tbody) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="padding:6px; position:relative;">
                <input type="text" class="form-input item-code" placeholder="Item Code" style="font-size:12px; width:100%;">
                <div class="suggest-list hidden"></div>
            </td>
            <td style="padding:6px;"><input type="number" class="form-input item-qty" value="1" min="1" style="font-size:12px; width:60px;"></td>
            <td style="padding:6px;"><input type="number" class="form-input item-rate" placeholder="0.00" style="font-size:12px; width:100px;"></td>
            <td style="padding:6px;"><input type="text" class="form-input item-amount" readonly style="font-size:12px; width:100px; background:#f3f4f6;"></td>
            <td style="padding:6px; text-align:center;"><button type="button" class="btn-text-action text-red-600" onclick="this.closest('tr').remove(); calculateQuotationTotals();" style="font-size:18px;">&times;</button></td>
        `;
        tbody.appendChild(row);

        // Wire up Item Suggestions
        const codeInp = row.querySelector(".item-code");
        const suggestBox = row.querySelector(".suggest-list");
        setupSuggestions(codeInp, suggestBox, "search_item_for_omnis", async (val, item) => {
            codeInp.value = item.value;
            // Fetch Details
            try {
                const res = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.get_item_details_for_omnis", { item_code: item.value });
                const payload = res.message || res;
                if (payload.ok) {
                    row.querySelector(".item-rate").value = payload.rate || 0;
                    calculateQuotationTotals();
                }
            } catch (e) { console.error("Item detail error", e); }
        });
    };

    window.calculateQuotationTotals = function () {
        const tbody = document.getElementById("qtn-items-body");
        let totalQty = 0;
        let totalUSD = 0;

        if (tbody) {
            Array.from(tbody.children).forEach(row => {
                const qtyInput = row.querySelector(".item-qty");
                const rateInput = row.querySelector(".item-rate");
                const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
                const rate = parseFloat(rateInput ? rateInput.value : 0) || 0;
                const amount = qty * rate;

                const amountInp = row.querySelector(".item-amount");
                if (amountInp) amountInp.value = amount.toFixed(2);

                totalQty += qty;
                totalUSD += amount;
            });
        }

        const qtyInp = document.getElementById("qtn-total-qty");
        const usdInp = document.getElementById("qtn-total-usd");
        const zarInp = document.getElementById("qtn-total-zar");

        if (qtyInp) qtyInp.value = totalQty;
        if (usdInp) usdInp.value = "$ " + totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (zarInp) zarInp.value = "R " + (totalUSD * 18.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

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

            const res = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.save_omnis_quotation", data);
            const payload = res.message || res;

            if (payload.ok) {
                resetQtnForm();
                showOnly(document.getElementById("view-quotations-list"));
                if (window.loadQuotationList) window.loadQuotationList();
                window.showQuotationOptions(payload.name, true);
            } else {
                throw new Error(payload.error || payload.message || "Save failed");
            }

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
            const data = {
                customer: customer,
                company: "Machinery Exchange", // Default for quick create
                sales_person: salesPerson,
                notes: title,
                items: [{ item_code: itemCode, qty: 1 }]
            };

            const res = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.save_omnis_quotation", data);
            const payload = res.message || res;

            if (payload.ok) {
                document.getElementById("qq-customer").value = "";
                document.getElementById("qq-title").value = "";
                document.getElementById("qq-item").value = "";
                if (document.getElementById("qq-salesperson")) {
                    document.getElementById("qq-salesperson").value = "";
                }
                if (window.loadQuotationList) window.loadQuotationList();
                window.showQuotationOptions(payload.name, true);
            } else {
                throw new Error(payload.error || payload.message || "Failed");
            }
        } catch (e) {
            alert("Quick Create Error: " + e.message);
        } finally {
            if (btn) btn.textContent = originalText;
        }
    }

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

        const fetchSuggestions = async (val) => {
            if (!val || val.length < 1) {
                list.classList.add('hidden');
                return;
            }

            try {
                const res = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard." + methodName, { txt: val });
                const data = res.message || res || [];

                if (data.length > 0) {
                    list.innerHTML = data.map(item => `
                        <div class="suggest-item" data-val="${item.value}">
                            <div style="font-weight:600; color:#334155;">${item.description}</div>
                            ${item.details ? `<div style="font-size:10px; color:#64748b;">${item.details}</div>` : ''}
                        </div>
                    `).join('');
                    list.classList.remove('hidden');

                    list.querySelectorAll('.suggest-item').forEach(el => {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            const val = el.getAttribute('data-val');
                            const item = data.find(i => i.value === val);
                            if (onSelect) {
                                onSelect(val, item);
                            } else {
                                input.value = val;
                            }
                            list.classList.add('hidden');
                        };
                    });
                } else {
                    list.innerHTML = '<div style="padding:8px; color:#94a3b8; font-size:11px; text-align:center;">No results</div>';
                    list.classList.remove('hidden');
                }
            } catch (e) { console.error("Suggest error", e); }
        };

        input.addEventListener('input', debounce((e) => fetchSuggestions(e.target.value), 500));

        // Hide on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== input && !list.contains(e.target)) {
                list.classList.add('hidden');
            }
        });
    }

    // --- PDF & OPTIONS MODAL ---
    window.showQuotationOptions = function (name, isNew = true) {
        console.log("showQuotationOptions called for:", name, "isNew:", isNew);
        const overlay = document.getElementById("qtn-opts-overlay");
        const title = document.getElementById("qtn-opts-title");
        const nameEl = document.getElementById("qtn-opts-name");

        if (!overlay || !nameEl) {
            console.error("Modal elements not found for Quotation Options");
            return;
        }

        nameEl.textContent = name;
        if (title) title.textContent = isNew ? "Quotation Created!" : "Quotation Options";

        overlay.classList.remove("hidden");
    };

    window.downloadPDF = async function (name) {
        if (!name) return;

        // Minor clean: remove the trailing question mark if it came from the prompt
        // But otherwise pass the ID as is to let the robust backend handle it
        const qtnId = name.replace(/\?$/, "").trim();

        console.log("downloadPDF ID:", qtnId);

        try {
            // 1. Fetch Full Data
            const resData = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.get_quotation_full_details", { qtn_name: qtnId });
            const data = resData.message || resData;
            if (!data.ok) throw new Error(data.error || "Failed to fetch quotation details");

            // 2. Render HTML Locally
            const html = renderQuotationHTML(data);

            // 3. Send HTML to backend for PDF conversion
            const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
            const url = `${base}/api/method/powerstar_salestrack.omnis_dashboard.download_quotation_pdf`;

            console.log("POSTing HTML (JSON) to backend via Sequencer...");

            const response = await window.frappeSequencer.add(() => fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf'
                },
                body: JSON.stringify({
                    qtn_name: qtnId,
                    html: html
                })
            }));

            if (!response.ok) {
                const errText = await response.text();
                console.error("Server Error Response:", errText);
                throw new Error("PDF generation failed on server (500). Please check Error Logs.");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `Quotation_${qtnId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            console.log("PDF download triggered successfully.");

        } catch (err) {
            console.error("PDF Download Error:", err);
            alert("Error: " + err.message);
        }
    };

    function renderQuotationHTML(data) {
        const qtn = data.quotation;
        const customer = data.customer || {};
        const items = data.items || [];

        const formatCurr = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (ds) => {
            if (!ds) return "";
            const d = new Date(ds);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        let itemsHtml = "";
        items.forEach(row => {
            const itemName = row.item_name || row.item_code;
            itemsHtml += `
            <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${Math.floor(row.qty)}</td>
                <td style="border: 1px solid #000; padding: 10px;">Equipment</td>
                <td style="border: 1px solid #000; padding: 10px;">${itemName}</td>
                <td style="border: 1px solid #000; padding: 10px;">
                    <strong>${itemName}</strong><br>
                    <div style="font-size: 9px; margin-top: 5px;">
                        ${row.description || 'Standard industrial specifications and performance features.'}
                    </div>
                </td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">TBA</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right;">$ ${formatCurr(row.rate)}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right;">$ ${formatCurr(row.amount)}</td>
            </tr>`;
        });

        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; margin: 40px; padding: 0; color: #333; line-height: 1.4; }
                .header { margin-bottom: 20px; }
                .logo-section { float: left; width: 45%; }
                .company-details { float: right; text-align: right; width: 50%; font-size: 9px; color: #444; }
                .clear { clear: both; }
                .title { text-align: center; font-size: 24px; font-weight: bold; margin: 40px 0 20px 0; letter-spacing: 2px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .info-table td { border: 1px solid #000; padding: 6px; }
                .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                .main-table th { background: #eeeeee; border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; }
                .section-title { font-weight: bold; margin-top: 20px; text-decoration: underline; font-size: 12px; }
                .footer-logos { margin-top: 50px; border-top: 1px solid #000; padding-top: 15px; text-align: center; opacity: 0.8; }
                .footer-logos-text { font-weight: bold; letter-spacing: 3px; font-size: 14px; color: #555; }
                ul { padding-left: 20px; }
                li { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    <div style="font-size: 28px; font-weight: 900; color: #cc0000; line-height: 0.9;">MACHINERY<br>EXCHANGE</div>
                    <div style="font-size: 10px; font-weight: bold; color: #000; margin-top: 5px;">Earthmoving Equipment Specialists</div>
                    <div style="height: 4px; background: linear-gradient(to right, #ffcc00, #cc0000); margin-top: 5px; width: 100%;"></div>
                </div>
                <div class="company-details">
                    <strong>Machinery Exchange (Pvt) Ltd</strong><br>
                    5 Martin Drive, Msasa, Harare • Tel: +263 (024) 2447180-2 / 0782 191 490<br>
                    Cnr 16th Avenue, Fife Street Ext, Belmont, Bulawayo • Tel: (0)292 263191<br>
                    Email: info@machinery-exchange.com • Website: www.machinery-exchange.com<br>
                    Reg No: 584/1954 • VAT No: 220119780 • TIN No: 2001663680
                </div>
                <div class="clear"></div>
            </div>

            <div class="title">QUOTATION</div>

            <table class="info-table">
                <tr>
                    <td width="25%"><strong>Date:</strong></td>
                    <td width="75%">${formatDate(qtn.transaction_date)}</td>
                </tr>
                <tr>
                    <td><strong>Quotation Ref No:</strong></td>
                    <td>${qtn.name}</td>
                </tr>
                <tr>
                    <td><strong>Customer:</strong></td>
                    <td>${qtn.customer_name}</td>
                </tr>
                <tr>
                    <td><strong>Contact Person:</strong></td>
                    <td>${customer.custom_primary_contact_name || qtn.contact_display || ''}</td>
                </tr>
                <tr>
                    <td><strong>Contact:</strong></td>
                    <td>${customer.mobile_no || ''}</td>
                </tr>
                <tr>
                    <td><strong>Email:</strong></td>
                    <td>${customer.email_id || ''}</td>
                </tr>
            </table>

            <p style="margin-top: 25px;">Dear Sir/Madam,</p>
            <p>We have pleasure in submitting our quotation for the requested equipment as follows:</p>

            <table class="main-table">
                <thead>
                    <tr>
                        <th width="8%">Qty</th>
                        <th width="12%">Equipment</th>
                        <th width="15%">Make/Model</th>
                        <th width="35%">Specification</th>
                        <th width="10%">Lead Time</th>
                        <th width="10%">Unit Price</th>
                        <th width="10%">Total USD</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="margin-top: 20px;">
                <p><strong>Warranty:</strong> 12 months or 1500 hours whichever occurs first (Standard Terms Apply).</p>
                <p><strong>Delivery:</strong> ${qtn.delivery || 'Harare'}</p>
            </div>

            <div class="section-title">Price qualification</div>
            <div style="font-size: 10px;">
                <ul>
                    <li>Prices are subject to change as a result of deviations in the exchange rate, statutory regulations or for errors or omissions on behalf of Machinery Exchange (Pvt), it's employees and suppliers. Furthermore, the price of the equipment is subject to change if delivery is delayed by the customer beyond the delivery period. The price ruling at the date of delivery to the customer will then apply.</li>
                </ul>
            </div>

            <div class="section-title">Payment terms</div>
            <div style="font-size: 10px;">
                <ul>
                    <li>Upon acceptance of this quotation, we will issue a proforma invoice. Payment terms to be discussed.</li>
                    <li>Finance terms are available subject to customers meeting due diligence requirements. These are available upon request.</li>
                </ul>
            </div>

            <div style="margin-top: 30px;">
                <p>Yours truly,<br>For and on behalf of Machinery Exchange (Pvt) Ltd</p>
                <p style="margin-top: 40px;"><strong>${qtn.sales_person || 'Sales Department'}</strong><br>Machinery Exchange</p>
            </div>

            <div class="footer-logos">
                <div class="footer-logos-text">SHANTUI | Bobcat | HITACHI | WIRTGEN | ROKBAK</div>
            </div>
        </body>
        </html>`;
    }

    window.submitQuickQuote = submitQuickQuote;

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        // Wire Quick Create
        const btnQq = document.getElementById("btn-qq-submit");
        if (btnQq) btnQq.onclick = submitQuickQuote;

        // Wire Quick Create Salesperson Suggestions
        setupSuggestions(
            document.getElementById("qq-salesperson"),
            document.getElementById("qq-salesperson-suggest"),
            "search_sales_person_for_omnis"
        );

        setupSuggestions(document.getElementById("qq-customer"), document.getElementById("qq-customer-suggest"), "search_customer_for_omnis");
        setupSuggestions(document.getElementById("qq-item"), document.getElementById("qq-item-suggest"), "search_item_for_omnis");

        // --- Bind Modal Buttons (After DOM is definitely ready) ---
        document.getElementById("btn-opts-close")?.addEventListener("click", () => {
            document.getElementById("qtn-opts-overlay").classList.add("hidden");
        });

        document.getElementById("btn-opts-print")?.addEventListener("click", () => {
            const name = document.getElementById("qtn-opts-name").textContent;
            window.downloadPDF(name);
        });

        document.getElementById("btn-opts-whatsapp")?.addEventListener("click", () => {
            alert("WhatsApp sharing will be implemented in a future update.");
        });
    });

})();
