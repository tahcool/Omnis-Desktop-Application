
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

            if (!window.supabase) throw new Error("Supabase client not found");
            const qtnId = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
            
            // Insert parent
            const qtnRes = await window.supabase.from("omnis_quotations").insert([{
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
            
            if (qtnRes.error) throw qtnRes.error;
            
            const dbQtnId = qtnRes.data[0].id;
            
            // Insert children
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                qty: i.qty,
                rate: i.rate,
                amount: i.qty * i.rate
            }));
            
            const itemRes = await window.supabase.from("omnis_quotation_items").insert(itemPayloads);
            if (itemRes.error) throw itemRes.error;
            
            const payload = { ok: true, name: qtnId };

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

    // --- AI HELPERS ---
    async function getOpenAIKey() {
        const { data: keyData } = await window.supabase
            .from("omnis_app_settings")
            .select("setting_value")
            .eq("setting_key", "openai_api_key")
            .single();
        let apiKey = keyData ? keyData.setting_value : "";
        if (!apiKey) apiKey = localStorage.getItem("omnis_openai_key") || "";
        return apiKey.trim();
    }

    // 1. MAGIC FILL
    window.performMagicFill = async function() {
        const btn = document.getElementById("btn-qq-magic");
        const input = document.getElementById("qq-magic-fill");
        const text = input ? input.value.trim() : "";
        if (!text) return;
        
        const originalText = btn ? btn.innerHTML : "Auto-Fill";
        if (btn) btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> AI...";
        
        try {
            const apiKey = await getOpenAIKey();
            if (!apiKey) throw new Error("OpenAI key not configured in settings.");
            
            const prompt = `Extract quotation details from this text: "${text}".
Return exactly this JSON format:
{
  "customer": "customer name or null",
  "salesperson": "salesperson name or null",
  "item_code": "equipment or item mentioned or null",
  "price": number or null,
  "lead_time": "lead time like '2 Weeks' or null"
}`;
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });
            if (!res.ok) throw new Error("Failed to contact OpenAI");
            const json = await res.json();
            const aiData = JSON.parse(json.choices[0].message.content);
            
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
            alert("Magic Fill Error: " + e.message);
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
            const apiKey = await getOpenAIKey();
            if (!apiKey) return;
            const prompt = `Generate a short, professional quotation title for selling "${item}" to "${customer}". Max 6 words. Return JSON: {"title": "..."}`;
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
            });
            const json = await res.json();
            const aiData = JSON.parse(json.choices[0].message.content);
            if (aiData.title) titleInp.value = aiData.title;
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
            const apiKey = await getOpenAIKey();
            
            // --- CUSTOMER INSIGHTS (RISK SCORING) ---
            if (customer) {
                const { data: cData } = await window.supabase.from("omnis_quotations").select("status").eq("customer_name", customer).order("created_at", { ascending: false }).limit(10);
                if (cData && cData.length > 0 && apiKey) {
                    const won = cData.filter(d => d.status === "Won").length;
                    const lost = cData.filter(d => d.status === "Lost").length;
                    const prompt = `A customer has ${won} won quotes and ${lost} lost quotes in the last 10 interactions. Give a 1 sentence AI risk/likelihood score. JSON: {"insight": "..."}`;
                    try {
                        const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }) });
                        const json = await res.json();
                        const aiData = JSON.parse(json.choices[0].message.content);
                        finalHtml += `<div><b>Customer AI Insight:</b> ${aiData.insight}</div>`;
                    } catch(e) {}
                }
            }
            
            // --- ITEM INTELLIGENCE ---
            if (itemCode) {
                // Fetch most recent price
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
                
                // Deduce Lead Time
                const { data: oData } = await window.supabase.from("omnis_tracking_orders").select("committed_lead_time, target_handover, actual_handover, status, notes").or(`machine.ilike.%${itemCode}%,model.ilike.%${itemCode}%`).order("created_at", { ascending: false }).limit(5);
                if (oData && oData.length > 0 && apiKey) {
                    const prompt = `Analyze these 5 recent orders for item "${itemCode}" and deduce a realistic lead time. Orders: ${JSON.stringify(oData)}. Return JSON: {"suggested_lead_time": "...", "reasoning": "..."}`;
                    try {
                        const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }) });
                        const json = await res.json();
                        const aiData = JSON.parse(json.choices[0].message.content);
                        if (leadTimeInput && (leadTimeInput.value === "TBD" || !leadTimeInput.value)) leadTimeInput.value = aiData.suggested_lead_time;
                        finalHtml += `<div style="margin-top:4px;"><b>AI Lead Time:</b> ${aiData.reasoning}</div>`;
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
                delivery: leadTime,
                items: [{ item_code: itemCode, qty: 1, rate: parseFloat(price || 0) }]
            };

            if (!window.supabase) throw new Error("Supabase client not found");
            const qtnId = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
            
            // Insert parent
            const qtnRes = await window.supabase.from("omnis_quotations").insert([{
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
            
            if (qtnRes.error) throw qtnRes.error;
            
            const dbQtnId = qtnRes.data[0].id;
            
            // Insert children
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                qty: i.qty,
                rate: i.rate,
                amount: i.qty * i.rate
            }));
            
            const itemRes = await window.supabase.from("omnis_quotation_items").insert(itemPayloads);
            if (itemRes.error) throw itemRes.error;
            
            const payload = { ok: true, name: qtnId };

            if (payload.ok) {
                // 4. Draft WhatsApp message using OpenAI
                const draftContainer = document.getElementById("qtn-opts-ai-draft-container");
                const draftArea = document.getElementById("qtn-opts-ai-draft");
                if (draftContainer && draftArea) {
                    draftContainer.style.display = "block";
                    draftArea.value = "AI is drafting a personalized WhatsApp message...";
                    getOpenAIKey().then(apiKey => {
                        if(apiKey) {
                            const prompt = `Draft a friendly, professional WhatsApp message for a B2B sales rep to send to customer "${data.customer}". The rep is sending them a quotation for "${itemCode}" at $${price}. Keep it short and use emojis natively.`;
                            fetch("https://api.openai.com/v1/chat/completions", {
                                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] })
                            }).then(r => r.json()).then(j => {
                                draftArea.value = j.choices[0].message.content;
                            }).catch(err => draftArea.value = "Could not draft message automatically.");
                        } else { draftArea.value = "OpenAI Key not configured."; }
                    });
                }

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

        if (window.setupSupabaseSuggestions) {
            let table = "", searchFields = "";
            if (methodName === "search_sales_person_for_omnis") {
                table = "omnis_sales_persons";
                searchFields = "name";
            } else if (methodName === "search_customer_for_omnis") {
                table = "customers";
                searchFields = "customer_name";
            } else if (methodName === "search_item_for_omnis") {
                table = "stock_inventory";
                searchFields = "model,brand";
            }
            
            if (table) {
                // Adapt the onSelect to match the old expected signature (val, item)
                const adaptedOnSelect = onSelect ? (mappedItem) => {
                    // setupSupabaseSuggestions returns a mappedItem with value, description, etc.
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
            // 1. Fetch Full Data
            if (!window.supabase) throw new Error("Supabase client not found");
            const qtnRes = await window.supabase.from("omnis_quotations").select("*").eq("name", qtnId).limit(1);
            if (qtnRes.error) throw qtnRes.error;
            if (!qtnRes.data || qtnRes.data.length === 0) throw new Error("Quotation not found");
            const qtnData = qtnRes.data[0];
            
            const itemsRes = await window.supabase.from("omnis_quotation_items").select("*").eq("quotation_id", qtnData.id);
            if (itemsRes.error) throw itemsRes.error;
            
            // Map to expected Frappe output shape
            const data = {
                ok: true,
                quotation: qtnData,
                customer: { custom_primary_contact_name: qtnData.contact_person },
                items: itemsRes.data.map(i => ({
                    item_code: i.item_code,
                    item_name: i.item_code,
                    qty: i.qty,
                    rate: i.rate,
                    amount: i.amount
                }))
            };
            if (!data.ok) throw new Error(data.error || "Failed to fetch quotation details");

            const templateSelect = document.getElementById("qtn-opts-template");
            const template = templateSelect ? templateSelect.value : 'machinery_exchange';

            // 2. Render HTML Locally
            const html = renderQuotationHTML(data, template);

            // 3. Generate PDF on the client (Print to PDF)
            console.log("Generating PDF locally...");
            
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '-10000px';
            iframe.style.bottom = '-10000px';
            document.body.appendChild(iframe);
            
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
            
            // Wait a moment for styles to apply before printing
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                // Clean up after print dialog closes
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }, 500);

            console.log("Local PDF print dialog triggered.");

        } catch (err) {
            console.error("PDF Download Error:", err);
            alert("Error: " + err.message);
        }
    };

    function renderQuotationHTML(data, template = 'machinery_exchange') {
        const qtn = data.quotation;
        const customer = data.customer || {};
        const items = data.items || [];

        const formatCurr = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (ds) => {
            if (!ds) return "";
            const d = new Date(ds);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        const isZAR = qtn.currency === 'ZAR' || (items[0] && items[0].rate > 100000); // Hack to detect ZAR
        const currSym = isZAR ? 'R' : '$';
        const currName = isZAR ? 'ZAR' : 'USD';

        let itemsHtml = "";
        items.forEach(row => {
            const itemName = row.item_name || row.item_code;
            itemsHtml += `
            <tr style="page-break-inside: avoid; text-align: center;">
                <td style="border: 1px solid #000; padding: 10px;">Equipment</td>
                <td style="border: 1px solid #000; padding: 10px;">${itemName}</td>
                <td style="border: 1px solid #000; padding: 10px;">
                    ${row.description || 'Standard industrial specifications and performance features.'}
                    <div style="color: red; font-weight: bold; margin-top: 15px; font-size: 14px;">Download Spec Sheet</div>
                </td>
                <td style="border: 1px solid #000; padding: 10px;">${qtn.delivery || '2 - 3 Weeks'}</td>
                <td style="border: 1px solid #000; padding: 10px;">${currSym} ${formatCurr(row.rate)}</td>
                <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">${currSym} ${formatCurr(row.amount)}</td>
            </tr>`;
        });

        let headerHtml = "";
        let supportHtml = "";
        let signatureHtml = "";

        if (template === 'sinopower') {
            headerHtml = `
            <div class="header">
                <div class="logo-section">
                    <div style="font-size: 28px; font-weight: 900; color: #1e3a8a; line-height: 0.9;">SINOPOWER<br>PUMP & GENERATOR</div>
                    <div style="font-size: 10px; font-weight: bold; color: #000; margin-top: 5px;">Power Generation Specialists</div>
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
                <p style="margin-top: 40px;"><strong>${qtn.sales_person || 'Sales Department'}</strong><br>Sinopower</p>
            </div>
            <div class="footer-logos">
                <div class="footer-logos-text" style="color: #1e3a8a;">SINOPOWER | GENERATORS | PUMPS</div>
            </div>`;
        } else {
            headerHtml = `
            <div class="header">
                <div class="logo-section">
                    <div style="font-size: 28px; font-weight: 900; color: #cc0000; line-height: 0.9; font-style: italic;">MACHINERY<br>EXCHANGE</div>
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
                <p style="margin-top: 40px;"><strong>${qtn.sales_person || 'Antony Dube'}</strong><br>National Equipment Sales Manager<br>Mobile: +263 772 294 246<br>Email: antony.dube@machinery-exchange.com</p>
            </div>
            <div class="footer-logos">
                <div style="font-size: 9px; font-weight: bold; text-align: left; margin-bottom: 5px;">PROUD DISTRIBUTORS OF:</div>
                <div class="footer-logos-text">SHANTUI | Bobcat | HITACHI | WIRTGEN | ROKBAK</div>
            </div>`;
        }

        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 13px; margin: 30px; padding: 0; color: #000; line-height: 1.4; }
                .header { margin-bottom: 30px; }
                .logo-section { float: left; width: 45%; }
                .company-details { float: right; text-align: right; width: 50%; font-size: 10px; color: #000; }
                .clear { clear: both; }
                .title { text-align: center; font-size: 26px; font-weight: bold; margin: 30px 0; }
                .info-table { width: 40%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                .info-table td { border: 1px solid #000; padding: 4px 8px; }
                .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                .main-table th { border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle; }
                .footer-logos { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
                .footer-logos-text { font-weight: 900; font-size: 20px; color: #000; word-spacing: 20px; }
            </style>
        </head>
        <body>
            ${headerHtml}

            <div class="title">SHANTUI QUOTATION</div>

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

            <p style="margin-top: 25px;">Dear Sir/Madam,</p>
            <p>We have pleasure in submitting our quotation for the requested equipment as follows:</p>

            <table class="main-table">
                <thead>
                    <tr>
                        <th width="12%">Equipment</th>
                        <th width="15%"><u>Make/</u><br><u>Model</u></th>
                        <th width="35%"><u>Specification</u></th>
                        <th width="13%"><u>Lead</u><br><u>Time/</u><br><u>Pricing</u><br><u>Notes</u></th>
                        <th width="12%"><u>Unit Price</u></th>
                        <th width="13%"><u>Total Unit Price</u><br><u>(Excl. VAT) ${currName}</u></th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    <tr>
                        <td colspan="3" style="border: 1px solid #000; padding: 6px 10px; text-align: left;"><u>Warranty</u> — 3000 hours or 1 year parts warranty</td>
                        <td colspan="3" style="border: 1px solid #000; padding: 6px 10px; text-align: left;"><u>Delivery</u> — HARARE</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 20px; text-decoration: underline; margin-bottom: 5px;">Price qualification</div>
            <ul style="margin-top: 0; padding-left: 20px;">
                <li>Prices are subject to change as a result of deviations in the exchange rate, statutory regulations or for errors or ommissions on behalf of Machinery Exchange (Pvt), it's employees and suppliers. Furthermore, the price of the equipment is subject to change if delivery is delayed by the customer beyond the delivery period. The price ruling at the date of delivery to the customer will then apply.</li>
            </ul>

            <div style="text-decoration: underline; margin-bottom: 5px;">Payment terms</div>
            <ul style="margin-top: 0; padding-left: 20px;">
                <li>Upon acceptance of this quotation, we will issue a proforma invoice. Payment terms to be discussed.</li>
                <li>Finance terms are available subject to customers meeting due diligence requirements. These are available upon request.</li>
            </ul>

            <div style="text-decoration: underline; margin-bottom: 5px;">Validity</div>
            <ul style="margin-top: 0; padding-left: 20px;">
                <li>The offer is valid for your acceptance for 30 days after the date of this quotation and thereafter subject to confirmation from us in writing.</li>
            </ul>
            
            <div style="page-break-before: always;"></div>
            ${headerHtml}

            ${supportHtml}

            <p style="margin-top: 25px;">We trust this meets with your requirements.</p>

            ${signatureHtml}
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
            alert("WhatsApp sharing will be implemented in a future update.");
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

})();
