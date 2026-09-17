
(function () {
    // Expose reset function
    window.resetQtnForm = function () {
        const form = document.getElementById("qtn-form");
        if (form) form.reset();
        const tbody = document.getElementById("qtn-items-body");
        if (tbody) tbody.innerHTML = "";

        const titleDisplay = document.getElementById("qtn-title-display");
        if (titleDisplay) titleDisplay.value = "";

        // Clear editing state
        window._editingQtnId = null;
        window._editingQtnName = null;

        // Reset form header to "New Quotation"
        const mainTitle = document.querySelector('#view-create-quotation .create-title');
        if (mainTitle) mainTitle.textContent = "New Quotation";

        // Hide print button for new quotations
        const printBtn = document.getElementById('btn-print-quotation');
        if (printBtn) printBtn.style.display = 'none';

        // Add one empty row and calc
        if (window.addQuotationItemRow) window.addQuotationItemRow();
        if (window.calculateQuotationTotals) window.calculateQuotationTotals();

        // Reset customer contacts section
        window._qtnCustomerContacts = [];
        window._qtnContactsCustomerName = '';
        const ccSection = document.getElementById('qtn-contacts-section');
        if (ccSection) ccSection.style.display = 'none';
        const ccChips = document.getElementById('qtn-contacts-chips');
        if (ccChips) ccChips.innerHTML = '<div style="color:#94a3b8; font-size:12px; padding:6px 0;">No contacts yet — add one below.</div>';
        const ccForm = document.getElementById('qtn-contact-form');
        if (ccForm) ccForm.style.display = 'none';
        const ccWarn = document.getElementById('qtn-contacts-warning');
        if (ccWarn) ccWarn.style.display = 'none';
    };


    /* ── Currency select: abbreviation display, full dropdown ── */
    window._currSelectExpand = function (sel) {
        Array.from(sel.options).forEach(opt => {
            if (opt.dataset.full) opt.textContent = opt.dataset.full;
        });
    };
    window._currSelectCollapse = function (sel) {
        Array.from(sel.options).forEach(opt => {
            if (opt.dataset.full) {
                opt.textContent = opt.selected ? opt.value : opt.dataset.full;
            }
        });
    };
    // Collapse all currency selects on page load
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('select.currency-abbrev-select').forEach(sel => {
            window._currSelectCollapse(sel);
        });
    });

    // --- OPEN EXISTING QUOTATION FOR EDITING ---
    window.openQuotationForEdit = async function (qtnName) {
        console.log("[QtnEdit] Opening quotation for edit:", qtnName);
        try {
            const sp = (window.salestrack && window.salestrack.supabase) || window.supabase || null;
            if (!sp || !sp.from) throw new Error("Supabase client not available");

            // Fetch the parent quotation
            const { data: qtnData, error: qtnErr } = await sp.from('omnis_quotations')
                .select('*')
                .eq('name', qtnName)
                .limit(1);
            
            if (qtnErr) throw new Error(typeof qtnErr === 'string' ? qtnErr : qtnErr.message);
            if (!qtnData || qtnData.length === 0) throw new Error("Quotation not found: " + qtnName);
            const qtn = qtnData[0];

            // Fetch the child items
            const { data: itemsData, error: itemsErr } = await sp.from('omnis_quotation_items')
                .select('*')
                .eq('quotation_id', qtn.id);
            
            if (itemsErr) console.warn("[QtnEdit] Items fetch error:", itemsErr);
            const items = itemsData || [];

            // Switch to the create/edit form view
            if (window.switchToView) window.switchToView('view-create-quotation');

            // Reset the form first
            if (window.resetQtnForm) window.resetQtnForm();

            // Store editing state
            window._editingQtnId = qtn.id;
            window._editingQtnName = qtn.name;

            // Populate header fields
            const titleDisplay = document.getElementById("qtn-title-display");
            if (titleDisplay) titleDisplay.value = qtn.name || '';

            const customerInp = document.getElementById("qtn-customer");
            if (customerInp) customerInp.value = qtn.customer_name || '';

            const customerNameInp = document.getElementById("qtn-customer-name");
            if (customerNameInp) customerNameInp.value = qtn.contact_person || qtn.customer_name || '';

            const companySelect = document.getElementById("qtn-company");
            if (companySelect && qtn.company) companySelect.value = qtn.company;

            const deliveryInp = document.getElementById("qtn-delivery");
            if (deliveryInp) deliveryInp.value = qtn.delivery || '';

            const dateInp = document.getElementById("qtn-date");
            if (dateInp && qtn.transaction_date) dateInp.value = qtn.transaction_date;

            const validTillInp = document.getElementById("qtn-valid-till");
            if (validTillInp && qtn.valid_till) validTillInp.value = qtn.valid_till;

            const salesPersonInp = document.getElementById("qtn-sales-person");
            if (salesPersonInp) salesPersonInp.value = qtn.sales_person || '';

            const bankInp = document.getElementById("qtn-bank");
            if (bankInp) bankInp.value = qtn.bank_account || '';

            const currencySelect = document.getElementById("qtn-currency");
            if (currencySelect && qtn.currency) currencySelect.value = qtn.currency;

            const pfiCheckbox = document.getElementById("qtn-pfi");
            if (pfiCheckbox) pfiCheckbox.checked = !!qtn.pfi_checked;

            const notesArea = document.getElementById("qtn-notes");
            if (notesArea) notesArea.value = qtn.notes || '';

            // Load customer contacts
            if (window.loadCustomerContacts && qtn.customer_name) {
                window.loadCustomerContacts(qtn.customer_name);
            }

            // Populate item rows
            const tbody = document.getElementById("qtn-items-body");
            if (tbody) tbody.innerHTML = ""; // Clear the default empty row

            if (items.length > 0) {
                items.forEach(item => {
                    if (window.addQuotationItemRow) window.addQuotationItemRow();
                    const lastRow = tbody.lastElementChild;
                    if (!lastRow) return;

                    const codeInp = lastRow.querySelector('.item-code');
                    if (codeInp) codeInp.value = item.item_code || '';

                    const nameInp = lastRow.querySelector('.item-name');
                    if (nameInp) nameInp.value = item.item_name || item.item_code || '';

                    const descInp = lastRow.querySelector('.item-desc');
                    if (descInp) descInp.value = item.description || '';

                    const qtyInp = lastRow.querySelector('.item-qty');
                    if (qtyInp) qtyInp.value = item.qty || 1;

                    const rateInp = lastRow.querySelector('.item-rate');
                    if (rateInp) rateInp.value = item.rate || 0;

                    const leadInp = lastRow.querySelector('.item-lead-time');
                    if (leadInp) leadInp.value = item.custom_lead_time || '';

                    const deliveryInp = lastRow.querySelector('.item-delivery');
                    if (deliveryInp) deliveryInp.value = item.delivery || '';

                    // Set product ID for edit button
                    if (window._fullCatalog && item.item_code) {
                        const prod = window._fullCatalog.find(p => p.item_code === item.item_code || p.item_name === item.item_code);
                        if (prod && prod.id) lastRow.setAttribute('data-product-id', prod.id);
                    }
                });
            } else {
                // Add one empty row if no items
                if (window.addQuotationItemRow) window.addQuotationItemRow();
            }

            // Update totals
            if (window.calculateQuotationTotals) window.calculateQuotationTotals();

            // Update the form header to show "Edit Quotation"
            const mainTitle = document.querySelector('#view-create-quotation .create-title');
            if (mainTitle) mainTitle.textContent = "Edit Quotation";

            // Show print button for existing quotations
            const printBtn = document.getElementById('btn-print-quotation');
            if (printBtn) printBtn.style.display = '';

            console.log("[QtnEdit] Loaded quotation:", qtn.name, "with", items.length, "items");

            // --- DATA QUALITY CHECK on loaded items (async, non-blocking) ---
            setTimeout(async () => {
                const sp = (window.salestrack && window.salestrack.supabase) || window.supabase || null;
                const tbody2 = document.getElementById("qtn-items-body");
                if (!tbody2) return;
                const rows = Array.from(tbody2.querySelectorAll('tr:not(.item-data-warning)'));
                
                for (const row of rows) {
                    const itemCode = row.querySelector('.item-code')?.value?.trim();
                    if (!itemCode) continue;
                    
                    let product = null;
                    
                    // Check _fullCatalog first
                    if (window._fullCatalog) {
                        product = window._fullCatalog.find(p => p.item_code === itemCode || p.item_name === itemCode);
                    }
                    
                    // Fallback to DB query
                    if (!product) {
                        try {
                            if (sp && sp.from) {
                                const { data } = await sp.from('products')
                                    .select('id,warranty,spec_sheet_url,description')
                                    .or(`item_code.eq.${itemCode},item_name.eq.${itemCode}`)
                                    .limit(1);
                                if (data && data.length > 0) product = data[0];
                            }
                            if (!product && window.electron) {
                                const res = await window.electron.invoke('supabase:query', {
                                    table: 'products', method: 'select',
                                    params: { columns: 'id,warranty,spec_sheet_url,description', or: `item_code.eq.${itemCode},item_name.eq.${itemCode}`, limit: 1 }
                                });
                                if (res?.ok && res.data?.length > 0) product = res.data[0];
                            }
                        } catch (err) {
                            console.warn('[QtnEdit] Product quality check failed for:', itemCode, err);
                        }
                    }
                    
                    if (!product) continue;
                    
                    // Store product ID for edit button
                    if (product.id) row.setAttribute('data-product-id', product.id);
                    
                    const warnings = [];
                    if (!product.warranty) warnings.push('⚠️ WARRANTY is missing');
                    if (!product.spec_sheet_url) warnings.push('📄 SPEC SHEET is not attached');
                    
                    if (warnings.length > 0) {
                        const banner = document.createElement('tr');
                        banner.className = 'item-data-warning';
                        banner.innerHTML = `<td colspan="10" style="padding:6px 12px; background:#fef3c7; border-left:3px solid #f59e0b; font-size:11px; color:#92400e;">
                            <i class="fas fa-exclamation-triangle" style="color:#f59e0b; margin-right:6px;"></i>
                            <strong>${itemCode}:</strong> ${warnings.join(' · ')}
                            <button type="button" onclick="window.editProductFromQtnRow(this.closest('tr').previousElementSibling)" style="margin-left:10px; padding:2px 10px; font-size:10px; font-weight:700; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Fix Now</button>
                            <button type="button" onclick="this.closest('tr').remove()" style="margin-left:4px; padding:2px 10px; font-size:10px; font-weight:700; background:#e5e7eb; color:#374151; border:none; border-radius:4px; cursor:pointer;">Dismiss</button>
                        </td>`;
                        row.after(banner);
                    }
                }
            }, 500); // Slight delay to let the UI render first
        } catch (e) {
            console.error("[QtnEdit] Error:", e);
            if (window.showToast) window.showToast('Error opening quotation: ' + (e.message || e), 'error');
        }
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
        if (addRowBtn) addRowBtn.onclick = function() { window.addQuotationItemRow(); };

        const submitBtn = document.getElementById("btn-submit-quotation");
        if (submitBtn) submitBtn.onclick = submitQuotation;

        const cancelBtn = document.getElementById("btn-cancel-quotation");
        if (cancelBtn) cancelBtn.onclick = () => {
            resetQtnForm();
            const printBtn = document.getElementById('btn-print-quotation');
            if (printBtn) printBtn.style.display = 'none';
            showOnly(document.getElementById("view-quotations-list"));
        };

        // Print button — triggers PDF generation for the current quotation
        const printBtn = document.getElementById("btn-print-quotation");
        if (printBtn) printBtn.onclick = () => {
            const qtnName = window._editingQtnName || document.getElementById("qtn-title-display")?.value;
            if (qtnName && window.downloadPDF) {
                window.downloadPDF(qtnName);
            } else {
                if (window.showToast) window.showToast('Save the quotation first before printing.', 'warning');
            }
        };

        // Initial Row
        const tbody = document.getElementById("qtn-items-body");
        if (tbody && tbody.children.length === 0) {
            window.addQuotationItemRow();
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
                // Load customer contacts from Supabase
                if (window.loadCustomerContacts) {
                    window.loadCustomerContacts(item.value);
                }
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
        row.style.cssText = "border-bottom:1px solid #f1f5f9; transition:background 0.15s;";
        row.onmouseenter = function() { this.style.background = '#f8fafc'; };
        row.onmouseleave = function() { this.style.background = ''; };
        row.innerHTML = `
            <td style="padding:8px 10px; position:relative;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <input type="text" class="form-input item-code" placeholder="Search product..." style="font-size:12px; flex:1;">
                    <button type="button" class="btn-edit-product" title="Edit product data" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size:14px; padding:2px 4px; flex-shrink:0; transition:color 0.2s;" onmouseenter="this.style.color='#3b82f6'" onmouseleave="this.style.color='#94a3b8'"><i class="fas fa-pencil-alt"></i></button>
                </div>
                <div class="suggest-list hidden" style="position:absolute; top:100%; left:6px; right:6px; z-index:9999; background:#fff; border:1px solid #e2e8f0; border-radius:8px; max-height:250px; overflow-y:auto; box-shadow:0 8px 25px rgba(0,0,0,0.15);"></div>
            </td>
            <td style="padding:8px 6px;"><input type="text" class="form-input item-name" placeholder="Item Name" readonly style="font-size:12px; width:100%; background:#f9fafb; color:#374151;"></td>
            <td style="padding:8px 6px;"><textarea class="form-input item-desc" placeholder="Description" style="font-size:11px; width:100%; min-height:36px; resize:vertical; background:#f9fafb; color:#374151;"></textarea></td>
            <td style="padding:8px 6px; text-align:center;"><input type="number" class="form-input item-qty" value="1" min="1" style="font-size:12px; width:55px; text-align:center;"></td>
            <td style="padding:8px 6px;"><input type="number" class="form-input item-rate" placeholder="0.00" style="font-size:12px; width:90px; text-align:right;"></td>
            <td style="padding:8px 6px;"><input type="text" class="form-input item-lead-time" placeholder="e.g. 2 Weeks" style="font-size:12px; width:100%;"></td>
            <td style="padding:8px 6px;"><input type="text" class="form-input item-delivery" placeholder="e.g. Harare" style="font-size:12px; width:100%;"></td>
            <td style="padding:8px 6px;"><input type="text" class="form-input item-amount" readonly style="font-size:12px; width:90px; background:#f3f4f6; text-align:right; font-weight:600;"></td>
            <td style="padding:8px 4px; text-align:center;"><button type="button" class="btn-text-action text-red-600" onclick="this.closest('tr').remove(); calculateQuotationTotals();" style="font-size:16px; color:#ef4444; opacity:0.6; transition:opacity 0.2s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.6'">&times;</button></td>
        `;
        tbody.appendChild(row);
        // Product search is handled via event delegation in index.html
    };

    // Apply top-level delivery to all item rows
    window.applyDeliveryToAllItems = function () {
        const deliveryVal = document.getElementById('qtn-delivery')?.value || '';
        if (!deliveryVal.trim()) { if (window.showToast) window.showToast('Enter a delivery location first.', 'warning'); return; }
        const tbody = document.getElementById('qtn-items-body');
        if (tbody) {
            Array.from(tbody.querySelectorAll('.item-delivery')).forEach(inp => inp.value = deliveryVal);
        }
    };

    // --- CURRENCY HELPERS ---
    const CURRENCY_SYMBOLS = { USD: '$', ZAR: 'R', BWP: 'P', ZMW: 'ZK', MZN: 'MT', EUR: '€', GBP: '£' };
    window._qtnExchangeRate = 1.0;
    window._qtnSelectedCurrency = 'USD';

    window.fetchExchangeRate = async function () {
        const currSelect = document.getElementById('qtn-currency');
        const currency = currSelect ? currSelect.value : 'USD';
        window._qtnSelectedCurrency = currency;

        const rateInfo = document.getElementById('qtn-rate-info');
        const rateDisplay = document.getElementById('qtn-rate-display');
        const rateSource = document.getElementById('qtn-rate-source');
        const fetchBtn = document.getElementById('qtn-fetch-rate-btn');

        if (currency === 'USD') {
            window._qtnExchangeRate = 1.0;
            if (rateInfo) rateInfo.style.display = 'none';
            window.calculateQuotationTotals();
            return;
        }

        if (fetchBtn) fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

        try {
            const resp = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currency}`);
            const json = await resp.json();
            const rate = json.rates && json.rates[currency];
            if (rate) {
                window._qtnExchangeRate = rate;
                if (rateDisplay) rateDisplay.textContent = `1 USD = ${rate.toFixed(4)} ${currency}`;
                if (rateSource) rateSource.textContent = '• ECB via Frankfurter (live)';
                if (rateInfo) rateInfo.style.display = 'block';
            } else {
                throw new Error('Rate not found');
            }
        } catch (e) {
            console.error('Exchange rate fetch error:', e);
            if (rateDisplay) rateDisplay.textContent = `Rate unavailable for ${currency}`;
            if (rateInfo) rateInfo.style.display = 'block';
            window._qtnExchangeRate = 1.0;
        } finally {
            if (fetchBtn) fetchBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Rate';
        }

        window.calculateQuotationTotals();
    };

    window.onQtnCurrencyChange = function () {
        window.fetchExchangeRate();
    };

    window.calculateQuotationTotals = function () {
        const tbody = document.getElementById("qtn-items-body");
        let totalQty = 0;
        let totalAmount = 0;

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
                totalAmount += amount;
            });
        }

        const currency = window._qtnSelectedCurrency || 'USD';
        const sym = CURRENCY_SYMBOLS[currency] || currency;

        const qtyInp = document.getElementById("qtn-total-qty");
        const totalLabel = document.getElementById("qtn-total-label");
        const usdInp = document.getElementById("qtn-total-usd");

        if (qtyInp) qtyInp.textContent = totalQty;
        if (totalLabel) totalLabel.textContent = `Total (${currency})`;
        if (usdInp) usdInp.textContent = sym + " " + totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                currency: document.getElementById("qtn-currency")?.value || 'USD',
                items: []
            };

            // Set contact_person from primary Supabase contact (or fallback to Customer Name field)
            const primaryC = (window._qtnCustomerContacts || []).find(c => c.is_primary);
            data.contact_person = (primaryC && primaryC.contact_name) || document.getElementById("qtn-customer-name")?.value || '';

            const tbody = document.getElementById("qtn-items-body");
            if (tbody) {
                Array.from(tbody.children).forEach(row => {
                    const itemCode = row.querySelector(".item-code")?.value;
                    const itemName = row.querySelector(".item-name")?.value;
                    const itemDesc = row.querySelector(".item-desc")?.value;
                    const qty = row.querySelector(".item-qty")?.value;
                    const rate = row.querySelector(".item-rate")?.value;
                    const leadTime = row.querySelector(".item-lead-time")?.value?.trim() || '';
                    const itemDelivery = row.querySelector(".item-delivery")?.value?.trim() || '';

                    if (itemCode && qty) {
                        data.items.push({
                            item_code: itemCode,
                            item_name: itemName || itemCode,
                            description: itemDesc || '',
                            qty: parseFloat(qty),
                            rate: parseFloat(rate || 0),
                            custom_lead_time: leadTime,
                            delivery: itemDelivery
                        });
                    }
                });
            }

            if (!data.customer) throw new Error("Customer is required");
            if (!data.sales_person) throw new Error("Sales Person is required");
            if (data.items.length === 0) throw new Error("At least one item is required");

            // Validate contacts — require at least one with email or WhatsApp
            const custContacts = window._qtnCustomerContacts || [];
            if (custContacts.length === 0) {
                throw new Error("At least one contact is required. Add a contact using the Contacts section above.");
            }
            const hasUsable = custContacts.some(c => c.email || c.whatsapp_number);
            if (!hasUsable) {
                throw new Error("At least one contact must have an email address or WhatsApp number.");
            }
            // Validate salutations — every contact must have one
            const missingSal = custContacts.filter(c => !c.salutation);
            if (missingSal.length > 0) {
                const names = missingSal.map(c => c.contact_name || 'Unnamed').join(', ');
                throw new Error(`The following contact(s) are missing a salutation (title): ${names}. Please update them before saving.`);
            }

            const sp = (window.salestrack && window.salestrack.supabase) || window.supabase || null;
            if (!sp) throw new Error("Supabase client not found");

            const isEdit = !!window._editingQtnId;
            let dbQtnId, qtnId;

            if (isEdit) {
                // --- UPDATE existing quotation ---
                dbQtnId = window._editingQtnId;
                qtnId = window._editingQtnName;
                console.log("[QtnSave] Updating existing quotation:", qtnId, dbQtnId);

                const updatePayload = {
                    customer_name: data.customer,
                    contact_person: data.contact_person,
                    transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                    company: data.company,
                    currency: data.currency,
                    sales_person: data.sales_person,
                    bank_account: data.bank_account,
                    pfi_checked: data.pfi_checked,
                    delivery: data.delivery,
                    notes: data.notes,
                    updated_at: new Date().toISOString()
                };

                const updRes = await sp.from("omnis_quotations").update(updatePayload).eq('id', dbQtnId).select();
                console.log("[QtnSave] Update parent result:", JSON.stringify(updRes));
                if (updRes.error) throw new Error(typeof updRes.error === 'string' ? updRes.error : (updRes.error.message || JSON.stringify(updRes.error)));

                // Delete old items and re-insert
                await sp.from("omnis_quotation_items").delete({ match: { quotation_id: dbQtnId } });

            } else {
                // --- CREATE new quotation ---
                const salCode = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
                qtnId = data.customer ? (data.customer + " - " + salCode) : salCode;
                console.log("[QtnSave] Creating new quotation:", qtnId);

                const qtnRes = await sp.from("omnis_quotations").insert([{
                    name: qtnId,
                    customer_name: data.customer,
                    contact_person: data.contact_person,
                    transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                    company: data.company,
                    currency: data.currency,
                    sales_person: data.sales_person,
                    bank_account: data.bank_account,
                    pfi_checked: data.pfi_checked,
                    delivery: data.delivery,
                    notes: data.notes
                }]).select();

                console.log("[QtnSave] Insert parent result:", JSON.stringify(qtnRes));
                if (qtnRes.error) throw new Error(typeof qtnRes.error === 'string' ? qtnRes.error : (qtnRes.error.message || JSON.stringify(qtnRes.error)));
                if (!qtnRes.data || !qtnRes.data.length) throw new Error("Insert succeeded but no data returned. Check RLS policies on omnis_quotations.");
                dbQtnId = qtnRes.data[0].id;
            }
            
            // Insert children (both create and update)
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                item_name: i.item_name || i.item_code,
                description: i.description || '',
                qty: i.qty,
                rate: i.rate,
                amount: i.qty * i.rate,
                custom_lead_time: i.custom_lead_time || '',
                delivery: i.delivery || ''
            }));
            
            const itemRes = await sp.from("omnis_quotation_items").insert(itemPayloads).select();
            console.log("[QtnSave] Insert items result:", JSON.stringify(itemRes));
            if (itemRes.error) throw new Error(typeof itemRes.error === 'string' ? itemRes.error : (itemRes.error.message || JSON.stringify(itemRes.error)));
            
            // After save, stay on the form — update state to "editing" mode
            window._editingQtnId = dbQtnId;
            window._editingQtnName = qtnId;

            // Update the title display
            const titleDisplay = document.getElementById("qtn-title-display");
            if (titleDisplay) titleDisplay.value = qtnId;

            // Update header to Edit mode
            const mainTitle = document.querySelector('#view-create-quotation .create-title');
            if (mainTitle) mainTitle.textContent = 'Edit Quotation';

            // Show print button
            const printBtn = document.getElementById('btn-print-quotation');
            if (printBtn) printBtn.style.display = '';

            // Refresh the quotation list in the background
            if (window.loadQuotationList) window.loadQuotationList();

            if (window.showToast) window.showToast('Quotation saved successfully!', 'success');

            // Show quotation options (PDF etc) after a beat
            setTimeout(() => window.showQuotationOptions(qtnId, !isEdit), 500);

        } catch (e) {
            console.error("[QtnSave] Error:", e);
            if (window.showToast) window.showToast('Error: ' + (e.message || e || 'Unknown error'), 'error');
        } finally {
            if (submitBtn) submitBtn.innerHTML = originalText;
        }
    };

    // --- AI HELPERS ---
    // OpenAI key is now stored server-side only.
    // All AI calls go through the ai-proxy Edge Function via window.callAIProxy().

    // 1. MAGIC FILL
    window.performMagicFill = async function() {
        const btn = document.getElementById("btn-qq-magic");
        const input = document.getElementById("qq-magic-fill");
        const text = input ? input.value.trim() : "";
        if (!text) return;
        
        const originalText = btn ? btn.innerHTML : "Auto-Fill";
        if (btn) btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> AI...";
        
        try {
            const resp = await window.callAIProxy('magic_fill', { text });
            const aiData = resp.result;
            
            if (aiData.customer) document.getElementById("qq-customer").value = aiData.customer;
            if (aiData.salesperson) document.getElementById("qq-salesperson").value = aiData.salesperson;
            if (aiData.item_code) document.getElementById("qq-item").value = aiData.item_code;
            if (aiData.price !== null) document.getElementById("qq-price").value = aiData.price;
            if (aiData.lead_time) document.getElementById("qq-lead-time").value = aiData.lead_time;
            
            input.value = ""; // Clear magic input
            window.fetchIntelligence();
            window.generateSmartTitle();
            
        } catch (e) {
            console.error("Magic Fill Error", e);
            if (window.showToast) window.showToast('Magic Fill Error: ' + e.message, 'error');
        } finally {
            if (btn) btn.innerHTML = originalText;
        }
    };

    // 2. SMART TITLE
    window.generateSmartTitle = async function() {
        const customer = document.getElementById("qq-customer")?.value;
        const item = document.getElementById("qq-item")?.value;
        const titleInp = document.getElementById("qq-title");
        if (!customer || !item || !titleInp || titleInp.value.trim() !== "") return;
        
        try {
            const resp = await window.callAIProxy('smart_title', { customer, item });
            if (resp.result?.title) titleInp.value = resp.result.title;
        } catch(e) { console.error("Smart Title Error", e); }
    };

    // 3 & 5. AI INTELLIGENCE & RISK SCORING
    window.fetchIntelligence = async function() {
        if (!window.supabase) return;
        
        const customer = document.getElementById("qq-customer")?.value?.trim();
        const itemCode = document.getElementById("qq-item")?.value?.trim();
        const priceInput = document.getElementById("qq-price");
        const leadTimeInput = document.getElementById("qq-lead-time");
        const intelBar = document.getElementById("qq-intelligence-bar");
        const intelContent = document.getElementById("qq-intelligence-content");
        
        if (!customer && !itemCode) return;
        
        if (intelBar && intelContent) {
            intelBar.style.display = "flex";
            intelContent.innerHTML = "<i>AI analyzing historical data...</i>";
        }
        
        let finalHtml = "";
        
        try {
            // --- CUSTOMER INSIGHTS (RISK SCORING) ---
            if (customer) {
                const { data: cData } = await window.supabase.from("omnis_quotations").select("status").eq("customer_name", customer).order("created_at", { ascending: false }).limit(10);
                if (cData && cData.length > 0) {
                    const won = cData.filter(d => d.status === "Won").length;
                    const lost = cData.filter(d => d.status === "Lost").length;
                    try {
                        const resp = await window.callAIProxy('quotation_intelligence', {
                            customer, item: itemCode || 'Unknown',
                            context: `Customer ${customer} has ${won} won and ${lost} lost quotes recently.`
                        });
                        if (resp.result?.insights) {
                            finalHtml += `<div><b>Customer AI Insight:</b> ${resp.result.insights}</div>`;
                        }
                    } catch(e) {}
                }
            }
            
            // --- ITEM INTELLIGENCE (non-AI: price lookup + staleness check) ---
            if (itemCode) {
                const { data: qData } = await window.supabase.from("omnis_quotation_items").select("rate, created_at").eq("item_code", itemCode).order("created_at", { ascending: false }).limit(1);
                if (qData && qData.length > 0) {
                    const latestRate = Number(qData[0].rate) || 0;
                    if (priceInput && !priceInput.value) priceInput.value = latestRate;
                    const createdDate = new Date(qData[0].created_at);
                    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    if (createdDate < ninetyDaysAgo) {
                        finalHtml += `<div style="color:#fca5a5; font-weight:600; margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Warning: AI detected price of $${latestRate.toLocaleString()} is over 3 months old.</div>`;
                    }
                }
                
                // Deduce Lead Time via AI proxy
                const { data: oData } = await window.supabase.from("omnis_tracking_orders").select("committed_lead_time, target_handover, actual_handover, status, notes").or(`machine.ilike.%${itemCode}%,model.ilike.%${itemCode}%`).order("created_at", { ascending: false }).limit(5);
                if (oData && oData.length > 0) {
                    try {
                        const resp = await window.callAIProxy('quotation_intelligence', {
                            customer: customer || 'Unknown', item: itemCode,
                            context: `Recent orders for ${itemCode}: ${JSON.stringify(oData)}. Suggest realistic lead time.`
                        });
                        if (resp.result?.suggestedPrice && leadTimeInput && (leadTimeInput.value === "TBD" || !leadTimeInput.value)) {
                            leadTimeInput.value = resp.result.suggestedPrice;
                        }
                        if (resp.result?.insights) {
                            finalHtml += `<div style="margin-top:4px;"><b>AI Lead Time:</b> ${resp.result.insights}</div>`;
                        }
                    } catch(e) {}
                }
            }
            
            if (intelContent) {
                intelContent.innerHTML = finalHtml || "<i>No significant AI insights found for this combination.</i>";
            }
            
        } catch (e) {
            console.error("Intelligence Error:", e);
            if (intelContent) intelContent.innerHTML = "<i>AI Analysis failed.</i>";
        }
    };

    // ⚡ QUICK CREATE LOGIC
    async function submitQuickQuote() {
        const btn = document.getElementById("btn-qq-submit");
        const customer = document.getElementById("qq-customer")?.value;
        const title = document.getElementById("qq-title")?.value;
        const itemCode = document.getElementById("qq-item")?.value;
        const salesPerson = document.getElementById("qq-salesperson")?.value;
        const price = document.getElementById("qq-price")?.value;
        const leadTime = document.getElementById("qq-lead-time")?.value;

        if (!customer) { if (window.showToast) window.showToast('Please select a customer', 'warning'); return; }
        if (!itemCode) { if (window.showToast) window.showToast('Please select an item', 'warning'); return; }

        const originalText = btn ? btn.textContent : "Create Quote";
        if (btn) btn.textContent = "Creating...";

        try {
            const qqCurrency = document.getElementById('qq-currency')?.value || 'USD';
            const data = {
                customer: customer,
                company: "Machinery Exchange", // Default for quick create
                sales_person: salesPerson,
                notes: title,
                delivery: leadTime,
                currency: qqCurrency,
                items: [{ item_code: itemCode, qty: 1, rate: parseFloat(price || 0) }]
            };

            const salCode = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
            const qtnId = customer ? (customer + " - " + salCode) : salCode;
            
            // Insert parent quotation via IPC proxy
            const qtnRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_quotations',
                method: 'insert',
                data: [{
                    name: qtnId,
                    customer_name: data.customer,
                    contact_person: data.contact_person,
                    transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                    company: data.company,
                    currency: data.currency,
                    sales_person: data.sales_person,
                    bank_account: data.bank_account,
                    pfi_checked: data.pfi_checked,
                    delivery: data.delivery,
                    notes: data.notes
                }]
            });
            
            if (!qtnRes.ok) throw new Error(qtnRes.error || "Failed to create quotation");
            
            const dbQtnId = qtnRes.data[0].id;
            
            // Insert line items via IPC proxy
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                qty: i.qty,
                rate: i.rate,
                amount: i.qty * i.rate
            }));
            
            const itemRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_quotation_items',
                method: 'insert',
                data: itemPayloads
            });
            if (!itemRes.ok) throw new Error(itemRes.error || "Failed to add quotation items");
            
            const payload = { ok: true, name: qtnId };

            if (payload.ok) {
                // 4. Draft WhatsApp message using AI proxy
                const draftContainer = document.getElementById("qtn-opts-ai-draft-container");
                const draftArea = document.getElementById("qtn-opts-ai-draft");
                if (draftContainer && draftArea) {
                    draftContainer.style.display = "block";
                    draftArea.value = "AI is drafting a personalized WhatsApp message...";
                    window.callAIProxy('quotation_intelligence', {
                        customer: data.customer, item: itemCode,
                        price: price,
                        context: `Draft a friendly WhatsApp message for sending a quotation for ${itemCode} at $${price} to ${data.customer}.`
                    }).then(resp => {
                        draftArea.value = resp.result?.insights || resp.result?.content || "Could not draft message.";
                    }).catch(() => { draftArea.value = "Could not draft message automatically."; });
                }

                document.getElementById("qq-customer").value = "";
                const qqTitle = document.getElementById("qq-title");
                if (qqTitle) qqTitle.value = "";
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
            if (window.showToast) window.showToast('Quick Create Error: ' + e.message, 'error');
        } finally {
            if (btn) btn.textContent = originalText;
        }

    }

    // --- HELPER: Suggestions ---
    function setupSuggestions(input, list, methodName, onSelect = null) {
        if (!input || !list) return;

        if (window.setupSupabaseSuggestions) {
            let table = "", searchFields = "";
            if (methodName === "search_sales_person_for_omnis") {
                table = "omnis_sales_persons";
                searchFields = "name";
            } else if (methodName === "search_customer_for_omnis") {
                table = "customers";
                searchFields = "customer_name";
            } else if (methodName === "search_item_for_omnis") {
                table = "products";
                searchFields = "item_name,item_code,brand_name";
            }
            
            if (table) {
                // Adapt the onSelect to match the old expected signature (val, item)
                const adaptedOnSelect = onSelect ? (mappedItem) => {
                    // setupSupabaseSuggestions returns a mappedItem with value, description, itemDescription, etc.
                    // We pass it to the original onSelect
                    onSelect(mappedItem.value, mappedItem);
                } : null;
                
                window.setupSupabaseSuggestions(input, list, table, searchFields, adaptedOnSelect);
                return;
            }
        }

        // Fallback (should not be reached if table mapped)
        console.warn("setupSupabaseSuggestions not available or table not mapped for:", methodName);
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
            // 1. Fetch quotation data via IPC proxy
            const qtnRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_quotations',
                method: 'select',
                params: { match: { name: qtnId }, limit: 1 }
            });
            if (!qtnRes.ok || !qtnRes.data || qtnRes.data.length === 0) throw new Error(qtnRes.error || "Quotation not found");
            const qtnData = qtnRes.data[0];
            
            // 2. Fetch line items
            const itemsRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_quotation_items',
                method: 'select',
                params: { filters: { quotation_id: qtnData.id } }
            });
            if (!itemsRes.ok) throw new Error(itemsRes.error || "Failed to fetch items");
            
            // 3. Enrich items with product catalog data (description, warranty, spec_sheet_url, brand)
            const enrichedItems = [];
            for (const i of (itemsRes.data || [])) {
                let productData = {};
                if (i.item_code) {
                    const prodRes = await window.electron.invoke('supabase:query', {
                        table: 'products',
                        method: 'select',
                        params: {
                            columns: 'item_name,item_group_name,description,warranty,spec_sheet_url,brand_name,image_url',
                            or: `item_code.eq.${i.item_code},item_name.eq.${i.item_code}`,
                            limit: 1
                        }
                    });
                    if (prodRes.ok && prodRes.data && prodRes.data.length > 0) {
                        productData = prodRes.data[0];
                    }
                }
                enrichedItems.push({
                    item_code: i.item_code,
                    item_name: productData.item_name || i.item_name || i.item_code,
                    item_group: productData.item_group_name || '',
                    description: productData.description || i.description || '',
                    warranty: productData.warranty || '',
                    spec_sheet_url: productData.spec_sheet_url || '',
                    brand_name: productData.brand_name || '',
                    qty: i.qty,
                    rate: i.rate,
                    amount: i.amount,
                    custom_lead_time: i.custom_lead_time || '',
                    delivery: i.delivery || ''
                });
            }

            // Fetch primary contact from centralised contacts table
            let primaryContact = null;
            if (window.getPrimaryCustomerContact) {
                primaryContact = await window.getPrimaryCustomerContact(qtnData.customer_name);
            }

            // Map to expected shape
            const data = {
                ok: true,
                quotation: qtnData,
                customer: {
                    custom_primary_contact_name: (primaryContact && primaryContact.contact_name) || qtnData.contact_person || '',
                    mobile_no: (primaryContact && primaryContact.whatsapp_number) || '',
                    email_id: (primaryContact && primaryContact.email) || ''
                },
                items: enrichedItems
            };

            // 4. Auto-detect template from company name
            const templateSelect = document.getElementById("qtn-opts-template");
            let template = templateSelect ? templateSelect.value : 'machinery_exchange';
            if (qtnData.company && qtnData.company.toLowerCase().includes('sinopower')) {
                template = 'sinopower';
            }

            // 5. Load company logos for PDF embedding
            let mxgLogo = '', spzLogo = '';
            const oemLogos = {};
            try {
                const mxgRes = await window.electron.invoke('app:getAssetBase64', { relativePath: 'assets/images/MXG Logo.png' });
                if (mxgRes.ok) mxgLogo = mxgRes.dataUri;
            } catch (e) { console.warn('Could not load MXG logo', e); }
            try {
                const spzRes = await window.electron.invoke('app:getAssetBase64', { relativePath: 'systems/powertrack/sinopower_logo.png' });
                if (spzRes.ok) spzLogo = spzRes.dataUri;
            } catch (e) { console.warn('Could not load SPZ logo', e); }
            // Load OEM brand logos for footer
            const oemPaths = {
                shantui: 'assets/images/Shantui_logo.png',
                bobcat: 'assets/images/Bobcat_Black.png',
                hitachi: 'assets/images/Landcross_logo.jpg',
                wirtgen: 'assets/images/Wirtgen_logo.png'
            };
            for (const [key, relPath] of Object.entries(oemPaths)) {
                try {
                    const res = await window.electron.invoke('app:getAssetBase64', { relativePath: relPath });
                    if (res.ok) oemLogos[key] = res.dataUri;
                } catch (e) { console.warn(`Could not load ${key} logo`, e); }
            }

            // 6. Format specifications using OpenAI (display-only, no DB changes)
            console.log("Formatting specifications for PDF...");
            for (const item of data.items || []) {
                if (!item.description) continue;
                try {
                    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer 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'
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [{
                                role: 'system',
                                content: 'You are a specification formatter. Convert the raw equipment specification text into clean HTML bullet points. Rules: 1) Use a <ul> list with <li> items. 2) Keep EVERY specification detail exactly as-is — do NOT change any values, model numbers, measurements, or text. 3) Just organize and separate the items into logical bullet points for readability. 4) Do NOT add any text, explanations, or headings. 5) Return ONLY the <ul>...</ul> HTML, nothing else.'
                            }, {
                                role: 'user',
                                content: item.description
                            }],
                            max_tokens: 500,
                            temperature: 0
                        })
                    });
                    const result = await resp.json();
                    const formatted = result.choices?.[0]?.message?.content?.trim();
                    if (formatted && formatted.includes('<ul>')) {
                        item._formattedDesc = formatted;
                    }
                } catch (e) {
                    console.warn('AI spec format failed for', item.item_name, e);
                }
            }

            // 7. Look up sales person profile for signature block
            let salesPersonProfile = {};
            if (qtnData.sales_person) {
                try {
                    const spLookup = await window.electron.invoke('supabase:query', {
                        table: 'omnis_sales_persons',
                        method: 'select',
                        params: {
                            columns: 'name, job_title, phone_number, email',
                            filters: { name: qtnData.sales_person },
                            limit: 1
                        }
                    });
                    if (spLookup.ok && spLookup.data && spLookup.data[0]) {
                        salesPersonProfile = spLookup.data[0];
                    }
                } catch (e) { console.warn('Could not load sales person profile', e); }
            }

            // 8. Render HTML Locally
            const html = renderQuotationHTML(data, template, { mxgLogo, spzLogo, oemLogos, salesPersonProfile });

            // 7. Generate PDF via Electron's native printToPDF (preserves clickable hyperlinks)
            console.log("Generating PDF via Electron printToPDF...");
            const pdfFilename = `${qtnId}_Quotation.pdf`;
            const pdfResult = await window.electron.invoke('print:toPDF', { htmlContent: html, filename: pdfFilename });
            if (pdfResult.canceled) { console.log("PDF save cancelled by user."); return; }
            if (!pdfResult.ok) throw new Error(pdfResult.error || 'PDF generation failed');
            console.log("PDF saved to:", pdfResult.filePath);

        } catch (err) {
            console.error("PDF Download Error:", err);
            if (window.showToast) window.showToast('Error: ' + err.message, 'error');
        }
    };

    function renderQuotationHTML(data, template = 'machinery_exchange', logos = {}) {
        const qtn = data.quotation;
        const customer = data.customer || {};
        const items = data.items || [];
        const sp = logos.salesPersonProfile || {};

        const formatCurr = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (ds) => {
            if (!ds) return "";
            const d = new Date(ds);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        const currCode = qtn.currency || 'USD';
        const currSymMap = { USD: '$', ZAR: 'R', BWP: 'P', ZMW: 'ZK', MZN: 'MT', EUR: '€', GBP: '£' };
        const currSym = currSymMap[currCode] || '$';
        const currName = currCode;
        const fmtPrice = (num) => `${currSym} ${(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Determine PDF title from brand(s) in items
        const brandSet = new Set();
        items.forEach(row => { if (row.brand_name) brandSet.add(row.brand_name.toUpperCase()); });
        const pdfBrandTitle = brandSet.size === 1 ? `${[...brandSet][0]} QUOTATION` : 'EQUIPMENT QUOTATION';

        let itemsHtml = "";
        items.forEach((row, idx) => {
            const itemName = row.item_name || row.item_code;
            const equipType = row.item_group || 'Equipment';
            const descText = row._formattedDesc || row.description || '';
            // Bold product name header + description (AI-formatted or raw)
            const specContent = `<strong>${itemName}</strong>${descText ? '<br>' + descText : ''}`;
            // Build spec sheet link only if a valid URL exists
            const hasValidSpec = row.spec_sheet_url && row.spec_sheet_url.startsWith('http');
            const specLink = hasValidSpec
                ? `<div style="margin-top: 10px; text-align: center;"><a href="${row.spec_sheet_url}" style="color: #cc0000; font-weight: bold; font-size: 12px; text-decoration: underline;">Download Spec</a></div>`
                : '';
            itemsHtml += `
            <tr style="page-break-inside: avoid; vertical-align: top;">
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.qty || 1}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${equipType}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${itemName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px;">
                    ${specContent}
                    ${specLink}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.custom_lead_time || 'TBD'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap;">${fmtPrice(row.rate)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; white-space: nowrap;">${fmtPrice(row.amount)}</td>
            </tr>`;
            // Per-item warranty + delivery row
            const warranty = row.warranty || '3000 hours or 1 year parts warranty';
            itemsHtml += `
            <tr style="page-break-inside: avoid;">
                <td colspan="4" style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 12px;"><strong>Warranty:</strong> ${warranty}</td>
                <td colspan="3" style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 12px;"><strong>Delivery:</strong> ${row.delivery || qtn.delivery || 'Harare'}</td>
            </tr>`;
        });

        let headerHtml = "";
        let supportHtml = "";
        let signatureHtml = "";

        if (template === 'sinopower') {
            headerHtml = `
            <div class="header">
                <div class="logo-section">
                    ${logos.spzLogo ? `<img src="${logos.spzLogo}" style="max-width: 220px; height: auto;" />` : `<div style="font-size: 28px; font-weight: 900; color: #1e3a8a; line-height: 0.9;">SINOPOWER<br>PUMP & GENERATOR</div>`}
                    <div style="height: 4px; background: linear-gradient(to right, #60a5fa, #1e3a8a); margin-top: 5px; width: 100%;"></div>
                </div>
                <div class="company-details">
                    <strong>Sinopower (Pvt) Ltd</strong><br>
                    Harare, Zimbabwe<br>
                    Email: sales@sinopower.co.zw • Website: www.sinopower.co.zw<br>
                </div>
                <div class="clear"></div>
            </div>`;
            supportHtml = `
            <div style="text-decoration: underline; margin-bottom: 5px;">Product Support</div>
            <ul style="margin-top: 0; padding-left: 20px;">
                <li>Sinopower is the authorised distributor for premium pump and generator equipment in Zimbabwe.</li>
                <li>All warranty, servicing, engineering and general support is provided by Sinopower.</li>
                <li>All spares supply to be provided by Sinopower</li>
            </ul>`;
            signatureHtml = `
            <div style="margin-top: 30px;">
                <p>Yours truly<br>For and on behalf of Sinopower (Pvt) Ltd</p>
                <p style="margin-top: 40px;"><strong>${sp.name || qtn.sales_person || 'Sales Department'}</strong><br>${sp.job_title || 'Sinopower'}${sp.phone_number ? '<br>Mobile: ' + sp.phone_number : ''}${sp.email ? '<br>Email: ' + sp.email : ''}</p>
            </div>
            <div class="footer-logos">
                <div class="footer-logos-text" style="color: #1e3a8a;">SINOPOWER | GENERATORS | PUMPS</div>
            </div>`;
        } else {
            headerHtml = `
            <div class="header">
                <div class="logo-section">
                    ${logos.mxgLogo ? `<img src="${logos.mxgLogo}" style="max-width: 180px; height: auto;" />` : `<div style="font-size: 28px; font-weight: 900; color: #cc0000; line-height: 0.9; font-style: italic;">MACHINERY<br>EXCHANGE</div>`}
                </div>
                <div class="company-details">
                    <strong>Machinery Exchange (Pvt) Ltd</strong><br>
                    5 Martin Drive, Msasa, Harare • Tel: +263 (024) 2447180-2 / 0782 191 490<br>
                    Cnr 16th Avenue, Fife Street Ext, Belmont, Bulawayo • Tel: (0)292 263191<br>
                    Email: info@machinery-exchange.com • Website: www.machinery-exchange.com<br>
                    Reg No: 584/1954 • VAT No: 220119780 • TIN No: 2001663680
                </div>
                <div class="clear"></div>
                <div style="text-align: center; font-size: 14px; font-weight: bold; color: #000; margin-top: 2px; margin-bottom: 4px;">Earthmoving Equipment Specialists</div>
                <div style="height: 3px; background: #cc0000; width: 100%;"></div>
                <div style="text-align: center; font-size: 10px; font-style: italic; font-weight: bold; color: #333; margin-top: 4px;">
                    Equipment Sales &amp; Rental • Machine Servicing • Repairs &amp; Rebuilds • Heavy Engineering &amp; Undercarriage Services
                </div>
            </div>`;
            supportHtml = `
            <div style="text-decoration: underline; margin-bottom: 5px;">Product Support</div>
            <ul style="margin-top: 0; padding-left: 20px;">
                <li>Machinery Exchange is the authorised distributor for Shantui, Hitachi, Wirtgen, Bobcat, Rokbak, Cummins, Baoli, Terex, Royal, Hangcha, Hamm, XCMG, John Deere, Weichai, Schwing Steter, Yanmar and Sleipner in Zimbabwe.</li>
                <li>All warranty, servicing, engineering and general support is provided by Machinery Exchange.</li>
                <li>All spares supply to be provided by Machinery Exchange</li>
            </ul>`;
            signatureHtml = `
            <div style="margin-top: 30px;">
                <p>Yours truly<br>For and on behalf of Machinery Exchange (Pvt) Ltd</p>
                <p style="margin-top: 40px;"><strong>${sp.name || qtn.sales_person || 'Sales Department'}</strong><br>${sp.job_title || 'Sales Department'}${sp.phone_number ? '<br>Mobile: ' + sp.phone_number : ''}${sp.email ? '<br>Email: ' + sp.email : ''}</p>
            </div>
            <div class="footer-logos">
                <div style="font-size: 9px; font-weight: bold; text-align: left; margin-bottom: 8px;">PROUD DISTRIBUTORS OF:</div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    ${logos.oemLogos?.shantui ? `<img src="${logos.oemLogos.shantui}" style="height: 45px; width: auto;" />` : '<span style="font-weight:900;font-size:18px;">SHANTUI</span>'}
                    ${logos.oemLogos?.bobcat ? `<img src="${logos.oemLogos.bobcat}" style="height: 45px; width: auto;" />` : '<span style="font-weight:900;font-size:18px;">Bobcat</span>'}
                    ${logos.oemLogos?.hitachi ? `<img src="${logos.oemLogos.hitachi}" style="height: 45px; width: auto;" />` : '<span style="font-weight:900;font-size:18px;">LANDCROSS</span>'}
                    ${logos.oemLogos?.wirtgen ? `<img src="${logos.oemLogos.wirtgen}" style="height: 60px; width: auto;" />` : '<span style="font-weight:900;font-size:18px;">WIRTGEN</span>'}
                </div>
            </div>`;
        }

        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 12px; margin: 20px 30px; padding: 0; color: #000; line-height: 1.35; }
                .header { margin-bottom: 15px; }
                .logo-section { float: left; width: 45%; }
                .company-details { float: right; text-align: right; width: 50%; font-size: 10px; color: #000; }
                .clear { clear: both; }
                .title { text-align: center; font-size: 24px; font-weight: bold; margin: 15px 0; }
                .info-table { width: 40%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
                .info-table td { border: 1px solid #000; padding: 4px 8px; }
                .main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .main-table th { border: 1px solid #000; padding: 8px 6px; text-align: center; font-weight: bold; vertical-align: middle; font-size: 12px; }
                .main-table td { font-size: 12px; }
                .footer-logos { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
                .footer-logos-text { font-weight: 900; font-size: 20px; color: #000; word-spacing: 20px; }
            </style>
        </head>
        <body>
            ${headerHtml}

            <div class="title">${pdfBrandTitle}</div>

            <table class="info-table">
                <tr>
                    <td width="40%">Date:</td>
                    <td width="60%">${formatDate(qtn.transaction_date)}</td>
                </tr>
                <tr>
                    <td>Quotation Ref No:</td>
                    <td>${qtn.name}</td>
                </tr>
                <tr>
                    <td>Customer:</td>
                    <td>${qtn.customer_name}</td>
                </tr>
                <tr>
                    <td>Contact Person:</td>
                    <td>${customer.custom_primary_contact_name || qtn.contact_display || '-'}</td>
                </tr>
                <tr>
                    <td>Contact:</td>
                    <td>${customer.mobile_no || '-'}</td>
                </tr>
                <tr>
                    <td>Email:</td>
                    <td>${customer.email_id || '-'}</td>
                </tr>
            </table>

            <p style="margin-top: 15px; margin-bottom: 3px;">Dear Sir/Madam,</p>
            <p style="margin-top: 0;">We have pleasure in submitting our quotation for the requested equipment as follows:</p>

            <table class="main-table">
                <thead>
                    <tr>
                        <th style="width: 30px;">Qty</th>
                        <th style="width: 80px;">Equipment</th>
                        <th style="width: 95px;">Make/Model</th>
                        <th>Specification</th>
                        <th style="width: 70px;">Lead Time</th>
                        <th style="width: 90px;">Unit Price</th>
                        <th style="width: 100px;">Total (Excl. VAT)<br>${currName}</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="margin-top: 15px; text-decoration: underline; margin-bottom: 3px; font-size: 12px;">Price qualification</div>
            <ul style="margin-top: 0; padding-left: 20px; font-size: 11px;">
                <li>Prices are subject to change as a result of deviations in the exchange rate, statutory regulations or for errors or ommissions on behalf of Machinery Exchange (Pvt), it's employees and suppliers. Furthermore, the price of the equipment is subject to change if delivery is delayed by the customer beyond the delivery period. The price ruling at the date of delivery to the customer will then apply.</li>
            </ul>

            <div style="text-decoration: underline; margin-bottom: 3px; font-size: 12px;">Payment terms</div>
            <ul style="margin-top: 0; padding-left: 20px; font-size: 11px;">
                <li>Upon acceptance of this quotation, we will issue a proforma invoice. Payment terms to be discussed.</li>
                <li>Finance terms are available subject to customers meeting due diligence requirements. These are available upon request.</li>
            </ul>

            <div style="text-decoration: underline; margin-bottom: 3px; font-size: 12px;">Validity</div>
            <ul style="margin-top: 0; padding-left: 20px; font-size: 11px;">
                <li>The offer is valid for your acceptance for 30 days after the date of this quotation and thereafter subject to confirmation from us in writing.</li>
            </ul>
            
            <div style="page-break-inside: avoid;">
            ${supportHtml}

            <p style="margin-top: 15px;">We trust this meets with your requirements.</p>

            ${signatureHtml}
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

        setupSuggestions(document.getElementById("qq-customer"), document.getElementById("qq-customer-suggest"), "search_customer_for_omnis", (val, item) => {
            document.getElementById("qq-customer").value = item.value;
            window.fetchIntelligence();
            window.generateSmartTitle();
        });
        
        setupSuggestions(document.getElementById("qq-item"), document.getElementById("qq-item-suggest"), "search_item_for_omnis", (val, item) => {
            document.getElementById("qq-item").value = item.value;
            window.fetchIntelligence();
            window.generateSmartTitle();
        });

        // --- Bind Modal Buttons (After DOM is definitely ready) ---
        document.getElementById("btn-opts-close")?.addEventListener("click", () => {
            document.getElementById("qtn-opts-overlay").classList.add("hidden");
            // Hide the AI Draft container for the next quote
            const draftContainer = document.getElementById("qtn-opts-ai-draft-container");
            if (draftContainer) draftContainer.style.display = "none";
        });

        document.getElementById("btn-opts-print")?.addEventListener("click", () => {
            const name = document.getElementById("qtn-opts-name").textContent;
            window.downloadPDF(name);
        });

        document.getElementById("btn-opts-whatsapp")?.addEventListener("click", () => {
            if (window.showToast) window.showToast('WhatsApp sharing will be implemented in a future update.', 'info');
        });

        document.getElementById("btn-opts-copy-draft")?.addEventListener("click", () => {
            const draft = document.getElementById("qtn-opts-ai-draft")?.value;
            if (draft) {
                navigator.clipboard.writeText(draft).then(() => {
                    const btn = document.getElementById("btn-opts-copy-draft");
                    btn.innerHTML = "<i class='fas fa-check'></i> Copied!";
                    setTimeout(() => btn.innerHTML = "<i class='far fa-copy'></i> Copy to Clipboard", 2000);
                });
            }
        });
    });

    /* ═══════════════════════════════════════════════════════════════════
       CUSTOMER CONTACTS MANAGEMENT
       Centralised contacts (email / WhatsApp) stored per customer_name
       in omnis_customer_contacts. Shared across Quotation & Order Tracking.
    ═══════════════════════════════════════════════════════════════════ */

    // In-memory cache for the currently loaded contacts
    window._qtnCustomerContacts = [];
    window._qtnContactsCustomerName = '';

    /** Get Supabase client */
    function _ccGetSp() {
        return (window.salestrack && window.salestrack.supabase) || window.supabase || null;
    }

    /** Load contacts from omnis_customer_contacts for a customer name */
    window.loadCustomerContacts = async function (customerName, targetChipsId, targetWarningId, targetWarningTextId) {
        if (!customerName) return [];
        const chipsId = targetChipsId || 'qtn-contacts-chips';
        const warnId = targetWarningId || 'qtn-contacts-warning';
        const warnTextId = targetWarningTextId || 'qtn-contacts-warning-text';

        const section = document.getElementById('qtn-contacts-section');
        if (section) section.style.display = '';

        try {
            const sp = _ccGetSp();
            if (!sp) return [];

            const { data, error } = await sp.from('omnis_customer_contacts')
                .select('*')
                .eq('customer_name', customerName)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) { console.error('[CC] Load error:', error); return []; }

            window._qtnCustomerContacts = data || [];
            window._qtnContactsCustomerName = customerName;

            renderContactChips(chipsId, warnId, warnTextId);
            return data || [];
        } catch (e) {
            console.error('[CC] Load contacts error:', e);
            return [];
        }
    };

    /** Render contact chips + warnings */
    function renderContactChips(chipsId, warnId, warnTextId) {
        const container = document.getElementById(chipsId || 'qtn-contacts-chips');
        const warningEl = document.getElementById(warnId || 'qtn-contacts-warning');
        const warningTextEl = document.getElementById(warnTextId || 'qtn-contacts-warning-text');
        if (!container) return;

        const contacts = window._qtnCustomerContacts || [];

        if (contacts.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8; font-size:12px; padding:6px 0;">No contacts yet — add one using the button above.</div>';
            if (warningEl) {
                warningEl.style.display = '';
                if (warningTextEl) warningTextEl.textContent = 'No contacts found for this customer. Add at least one contact with an email or WhatsApp number.';
            }
            return;
        }

        // Build warnings for missing data
        const missingParts = [];
        const noEmail = contacts.filter(c => !c.email);
        const noWhatsApp = contacts.filter(c => !c.whatsapp_number);
        const noPrimary = !contacts.some(c => c.is_primary);
        const noSalutation = contacts.filter(c => !c.salutation);

        if (noEmail.length > 0) missingParts.push(`${noEmail.length} contact(s) missing email`);
        if (noWhatsApp.length > 0) missingParts.push(`${noWhatsApp.length} contact(s) missing WhatsApp`);
        if (noSalutation.length > 0) missingParts.push(`${noSalutation.length} contact(s) missing salutation — click the ⚠ badge to fix`);
        if (noPrimary && contacts.length > 1) missingParts.push('No primary contact set — click the ★ to set one');

        if (warningEl) {
            if (missingParts.length > 0) {
                warningEl.style.display = '';
                if (warningTextEl) warningTextEl.textContent = missingParts.join(' · ');
            } else {
                warningEl.style.display = 'none';
            }
        }

        // Auto-set primary if only one contact
        if (contacts.length === 1 && !contacts[0].is_primary) {
            togglePrimaryContact(contacts[0].id, true);
            return; // re-renders via recursive call
        }

        container.innerHTML = contacts.map((c, idx) => {
            const isPrimary = c.is_primary;
            const starColor = isPrimary ? '#f59e0b' : '#cbd5e1';
            const starTitle = isPrimary ? 'Primary contact (shown on print)' : 'Set as primary';
            const borderColor = isPrimary ? '#fde68a' : '#e2e8f0';
            const bgColor = isPrimary ? '#fffbeb' : '#f8fafc';

            const emailBadge = c.email
                ? `<span style="font-size:10px; color:#3b82f6; background:#eff6ff; padding:2px 6px; border-radius:4px;"><i class="fas fa-envelope" style="margin-right:3px;"></i>${c.email}</span>`
                : `<span style="font-size:10px; color:#f59e0b; background:#fffbeb; padding:2px 6px; border-radius:4px;"><i class="fas fa-exclamation-circle" style="margin-right:3px;"></i>No email</span>`;

            const waBadge = c.whatsapp_number
                ? `<span style="font-size:10px; color:#25d366; background:#f0fdf4; padding:2px 6px; border-radius:4px;"><i class="fab fa-whatsapp" style="margin-right:3px;"></i>${c.whatsapp_number}</span>`
                : `<span style="font-size:10px; color:#f59e0b; background:#fffbeb; padding:2px 6px; border-radius:4px;"><i class="fas fa-exclamation-circle" style="margin-right:3px;"></i>No WhatsApp</span>`;

            const salBadge = c.salutation
                ? `<span style="font-size:10px; color:#6366f1; background:#eef2ff; padding:2px 6px; border-radius:4px;"><i class="fas fa-user-tag" style="margin-right:3px;"></i>${c.salutation}</span>`
                : `<span onclick="window.fixContactSalutation('${c.id}', '${(c.contact_name || 'Unnamed').replace(/'/g, '\\&#39;')}')" style="font-size:10px; color:#ef4444; background:#fef2f2; padding:2px 6px; border-radius:4px; cursor:pointer;" title="Click to set salutation"><i class="fas fa-exclamation-triangle" style="margin-right:3px;"></i>No salutation</span>`;

            return `
              <div style="display:flex; align-items:center; gap:8px; background:${bgColor}; border:1px solid ${borderColor}; border-radius:8px; padding:6px 10px; animation: slideInRight 0.2s ease;">
                <button type="button" onclick="window.togglePrimaryContact('${c.id}')" title="${starTitle}"
                  style="background:none; border:none; cursor:pointer; font-size:14px; color:${starColor}; padding:0;">
                  <i class="fas fa-star"></i>
                </button>
                <div style="flex:1;">
                  <div style="font-weight:700; font-size:12px; color:#1e293b;">${c.salutation ? c.salutation + ' ' : ''}${c.contact_name || 'Unnamed'}${isPrimary ? ' <span style="font-size:9px; color:#f59e0b; font-weight:800; text-transform:uppercase;">(Primary)</span>' : ''}</div>
                  <div style="display:flex; gap:6px; margin-top:3px; flex-wrap:wrap;">
                    ${salBadge}
                    ${emailBadge}
                    ${waBadge}
                  </div>
                </div>
                <button type="button" onclick="window.deleteCustomerContact('${c.id}')" title="Remove contact"
                  style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:12px; padding:2px;">
                  <i class="fas fa-times-circle"></i>
                </button>
              </div>`;
        }).join('');
    }

    /** Toggle add-contact form visibility */
    window.toggleQtnContactForm = function (show) {
        const form = document.getElementById('qtn-contact-form');
        if (!form) return;
        const isVisible = form.style.display !== 'none';
        if (show === false || (show === undefined && isVisible)) {
            form.style.display = 'none';
            // Clear fields
            ['qtn-cc-name', 'qtn-cc-email', 'qtn-cc-whatsapp', 'qtn-cc-salutation-custom'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reset salutation dropdown
            const salSel = document.getElementById('qtn-cc-salutation');
            if (salSel) { salSel.value = ''; salSel.style.display = ''; }
            const salCustom = document.getElementById('qtn-cc-salutation-custom');
            if (salCustom) salCustom.style.display = 'none';
        } else {
            form.style.display = '';
            document.getElementById('qtn-cc-name')?.focus();
        }
    };

    /** Save a new contact */
    window.saveQtnContact = async function () {
        const customerName = window._qtnContactsCustomerName || document.getElementById('qtn-customer')?.value?.trim();
        if (!customerName) {
            if (window.showToast) window.showToast('Please select a customer first.', 'warning');
            return;
        }

        const contactName = document.getElementById('qtn-cc-name')?.value?.trim() || '';
        const email = document.getElementById('qtn-cc-email')?.value?.trim() || '';
        const whatsapp = document.getElementById('qtn-cc-whatsapp')?.value?.trim() || '';

        // Read salutation — prefer custom input if visible, otherwise dropdown
        const salCustomEl = document.getElementById('qtn-cc-salutation-custom');
        const salSelEl = document.getElementById('qtn-cc-salutation');
        let salutation = '';
        if (salCustomEl && salCustomEl.style.display !== 'none') {
            salutation = salCustomEl.value.trim();
        } else if (salSelEl && salSelEl.value && salSelEl.value !== '__custom__') {
            salutation = salSelEl.value;
        }

        if (!contactName) {
            if (window.showToast) window.showToast('Contact name is required.', 'warning');
            return;
        }

        try {
            const sp = _ccGetSp();
            if (!sp) throw new Error('Supabase not available');

            const contacts = window._qtnCustomerContacts || [];
            const isPrimary = contacts.length === 0; // First contact is auto-primary

            const { data, error } = await sp.from('omnis_customer_contacts').insert([{
                customer_name: customerName,
                salutation: salutation || null,
                contact_name: contactName,
                email: email || null,
                whatsapp_number: whatsapp || null,
                is_primary: isPrimary
            }]).select();

            if (error) throw new Error(error.message || JSON.stringify(error));

            if (window.showToast) window.showToast('Contact saved', 'success');
            window.toggleQtnContactForm(false);
            await window.loadCustomerContacts(customerName);
        } catch (e) {
            console.error('[CC] Save error:', e);
            if (window.showToast) window.showToast('Error saving contact: ' + e.message, 'error');
        }
    };

    /** Toggle primary status */
    window.togglePrimaryContact = async function (contactId, silent) {
        try {
            const sp = _ccGetSp();
            if (!sp) return;
            const customerName = window._qtnContactsCustomerName;
            if (!customerName) return;

            // Unset all primary for this customer
            await sp.from('omnis_customer_contacts')
                .update({ is_primary: false, updated_at: new Date().toISOString() })
                .eq('customer_name', customerName);

            // Set the clicked one as primary
            await sp.from('omnis_customer_contacts')
                .update({ is_primary: true, updated_at: new Date().toISOString() })
                .eq('id', contactId);

            if (!silent && window.showToast) window.showToast('Primary contact updated', 'success');
            await window.loadCustomerContacts(customerName);
        } catch (e) {
            console.error('[CC] Toggle primary error:', e);
        }
    };

    /** Delete a contact */
    window.deleteCustomerContact = async function (contactId) {
        if (!confirm('Remove this contact?')) return;
        try {
            const sp = _ccGetSp();
            if (!sp) return;

            await sp.from('omnis_customer_contacts').delete().eq('id', contactId);

            if (window.showToast) window.showToast('Contact removed', 'success');
            await window.loadCustomerContacts(window._qtnContactsCustomerName);
        } catch (e) {
            console.error('[CC] Delete error:', e);
            if (window.showToast) window.showToast('Error removing contact: ' + e.message, 'error');
        }
    };

    /** Quick-fix: set salutation on an existing contact via prompt */
    window.fixContactSalutation = async function (contactId, contactName) {
        const salOptions = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Eng', 'Hon'];
        const chosen = prompt(
            `Set salutation for ${contactName}:\n\nCommon options: ${salOptions.join(', ')}\n\nType a salutation below:`,
            'Mr'
        );
        if (!chosen || !chosen.trim()) return;

        try {
            const sp = _ccGetSp();
            if (!sp) return;

            await sp.from('omnis_customer_contacts')
                .update({ salutation: chosen.trim(), updated_at: new Date().toISOString() })
                .eq('id', contactId);

            if (window.showToast) window.showToast(`Salutation set to "${chosen.trim()}" for ${contactName}`, 'success');
            await window.loadCustomerContacts(window._qtnContactsCustomerName);
        } catch (e) {
            console.error('[CC] Fix salutation error:', e);
            if (window.showToast) window.showToast('Error updating salutation: ' + e.message, 'error');
        }
    };

    /** Get primary contact for a customer (used by print & Order Tracking) */
    window.getPrimaryCustomerContact = async function (customerName) {
        if (!customerName) return null;
        try {
            const sp = _ccGetSp();
            if (!sp) return null;

            const { data, error } = await sp.from('omnis_customer_contacts')
                .select('*')
                .eq('customer_name', customerName)
                .eq('is_primary', true)
                .limit(1);

            if (error || !data || data.length === 0) {
                // Fallback: get any contact for this customer
                const { data: any } = await sp.from('omnis_customer_contacts')
                    .select('*')
                    .eq('customer_name', customerName)
                    .order('created_at', { ascending: true })
                    .limit(1);
                return (any && any[0]) || null;
            }
            return data[0];
        } catch (e) {
            console.error('[CC] Get primary error:', e);
            return null;
        }
    };

    /* ═══════════════════════════════════════════════════════════════════
       ONE-TIME MIGRATION: order_contacts → omnis_customer_contacts
       Copies contacts from Order Tracking into the centralised table so
       they appear on the Quotation form when the same customer is selected.
     ═══════════════════════════════════════════════════════════════════ */
    window.migrateOrderContacts = async function () {
        const FLAG = 'omnis_oc_migration_done';
        const sp = _ccGetSp();
        if (!sp) { console.warn('[OC-Migration] No Supabase client'); return; }

        console.log('[OC-Migration] Starting order_contacts → omnis_customer_contacts migration...');

        try {
            // 1. Fetch all fmb_reports with their order_contacts
            const { data: reports, error: rErr } = await sp
                .from('fmb_reports')
                .select('customer_id, order_contacts(salutation, name, phone, email)');

            if (rErr) { console.error('[OC-Migration] fmb_reports fetch error:', rErr); return; }
            if (!reports || reports.length === 0) {
                console.log('[OC-Migration] No fmb_reports found, nothing to migrate.');
                localStorage.setItem(FLAG, 'true');
                return;
            }

            // 2. Deduplicate by customer + contact name
            const contactMap = new Map();
            for (const report of reports) {
                const customer = (report.customer_id || '').trim();
                if (!customer) continue;
                for (const c of (report.order_contacts || [])) {
                    const name = (c.name || '').trim();
                    if (!name || (name.length === 36 && name.includes('-'))) continue; // skip UUIDs
                    const key = `${customer}|${name}`.toLowerCase();
                    if (!contactMap.has(key)) {
                        contactMap.set(key, {
                            customer_name: customer,
                            contact_name: name,
                            email: (c.email || '').trim() || null,
                            whatsapp_number: (c.phone || '').trim() || null,
                            is_primary: false
                        });
                    } else {
                        const existing = contactMap.get(key);
                        if (!existing.email && c.email) existing.email = c.email.trim();
                        if (!existing.whatsapp_number && c.phone) existing.whatsapp_number = c.phone.trim();
                    }
                }
            }

            if (contactMap.size === 0) {
                console.log('[OC-Migration] No contacts found in order_contacts.');
                localStorage.setItem(FLAG, 'true');
                return;
            }

            // 3. Fetch existing omnis_customer_contacts to avoid duplicates
            const { data: existing } = await sp
                .from('omnis_customer_contacts')
                .select('customer_name, contact_name');

            const existingKeys = new Set((existing || []).map(
                e => `${e.customer_name}|${e.contact_name}`.toLowerCase()
            ));
            const existingCustomers = new Set((existing || []).map(
                e => e.customer_name.toLowerCase()
            ));

            const toInsert = [...contactMap.values()].filter(c =>
                !existingKeys.has(`${c.customer_name}|${c.contact_name}`.toLowerCase())
            );

            if (toInsert.length === 0) {
                console.log('[OC-Migration] All contacts already exist. Migration complete.');
                localStorage.setItem(FLAG, 'true');
                return;
            }

            // 4. Set first contact per customer as primary (if customer has no existing contacts)
            const primarySet = new Set();
            for (const c of toInsert) {
                const ck = c.customer_name.toLowerCase();
                if (!primarySet.has(ck) && !existingCustomers.has(ck)) {
                    c.is_primary = true;
                    primarySet.add(ck);
                }
            }

            // 5. Insert in batches
            let inserted = 0;
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                const { error: iErr } = await sp.from('omnis_customer_contacts').insert(batch);
                if (iErr) {
                    console.error(`[OC-Migration] Insert error (batch ${i}):`, iErr);
                } else {
                    inserted += batch.length;
                }
            }

            const customers = new Set(toInsert.map(c => c.customer_name));
            console.log(`[OC-Migration] ✅ Migrated ${inserted} contacts for ${customers.size} customers.`);
            localStorage.setItem(FLAG, 'true');

        } catch (e) {
            console.error('[OC-Migration] Error:', e);
        }
    };

    // Auto-run migration once on load
    document.addEventListener('DOMContentLoaded', () => {
        if (!localStorage.getItem('omnis_oc_migration_done')) {
            setTimeout(() => window.migrateOrderContacts(), 3000); // delay to let auth settle
        }
    });

})();
