
/* ---------- CREATE CE / OPPORTUNITY LOGIC ---------- */
(() => {
    // Elements
    const viewCreateCe = document.getElementById("view-create-ce");
    const navCreateCe = document.getElementById("nav-create-ce");
    const ceSaveBtn = document.getElementById("ce-save");
    const ceCancelBtn = document.getElementById("ce-cancel");
    const ceItemsBody = document.getElementById("ce-items-body");
    const ceItemsAddBtn = document.getElementById("ce-items-add");
    const ceItemsTotalEl = document.getElementById("ce-items-total");

    // Inputs (Common)
    const ceSeries = document.getElementById("ce-series");
    const ceOppFrom = document.getElementById("ce-opp-from");
    const ceParty = document.getElementById("ce-party");
    const cePartySuggest = document.getElementById("ce-party-suggest");
    const ceSalesperson = document.getElementById("ce-salesperson");
    const ceSalespersonSuggest = document.getElementById("ce-salesperson-suggest");
    const ceStatus = document.getElementById("ce-status");
    const ceAmount = document.getElementById("ce-amount");
    const ceCurrency = document.getElementById("ce-currency");
    const ceCompany = document.getElementById("ce-company");
    const ceCompanySuggest = document.getElementById("ce-company-suggest");
    const ceDate = document.getElementById("ce-date");
    const ceTitle = document.getElementById("ce-title");
    const ceNotes = document.getElementById("ce-notes");

    // Inputs (Contacts)
    const ceContactPerson = document.getElementById("ce-contact-person");
    const ceContactPersonSuggest = document.getElementById("ce-contact-person-suggest");
    const ceJobTitle = document.getElementById("ce-job-title");
    const ceEmail = document.getElementById("ce-email");
    const ceMobile = document.getElementById("ce-mobile");
    const ceWhatsapp = document.getElementById("ce-whatsapp");
    const cePhone = document.getElementById("ce-phone");

    // Expose View for other scripts
    if (viewCreateCe) window.viewCreateCe = viewCreateCe;

    // Init Logic
    if (navCreateCe) {
        navCreateCe.addEventListener("click", () => {
            resetCeForm();
            if (typeof showOnly === 'function' && viewCreateCe) showOnly(viewCreateCe);
            if (typeof activateNavItem === 'function') activateNavItem(navCreateCe);
            if (typeof mainTitle !== 'undefined') mainTitle.textContent = "Create CE (Opportunity)";
        });
    }

    if (ceCancelBtn) {
        ceCancelBtn.addEventListener("click", () => {
            // Assuming viewDashboard and others are global
            if (typeof viewDashboard !== 'undefined') showOnly(viewDashboard);
            const dashboardNav = document.querySelector('.nav-item[data-view="view-dashboard"]');
            if (dashboardNav) activateNavItem(dashboardNav);
            if (typeof mainTitle !== 'undefined') mainTitle.textContent = "Dashboard";
        });
    }

    function switchCeTab(tabName) {
        // Buttons
        document.querySelectorAll("#view-create-ce .tab-btn").forEach(b => b.classList.remove("active"));
        const btn = document.getElementById("tab-ce-" + tabName);
        if (btn) btn.classList.add("active");

        // Content
        document.querySelectorAll(".ce-tab-content").forEach(c => c.classList.add("hidden"));
        const tab = document.getElementById("ce-tab-" + tabName);
        if (tab) tab.classList.remove("hidden");
    }
    // Make global for onclick
    window.switchCeTab = switchCeTab;

    function resetCeForm() {
        // Defaults
        if (ceSeries) ceSeries.selectedIndex = 0;
        if (ceStatus) ceStatus.value = "Open";
        if (ceOppFrom) ceOppFrom.value = "Customer";
        if (ceDate) ceDate.valueAsDate = new Date();
        if (ceCurrency) ceCurrency.value = "USD";

        // Clear text
        [ceParty, ceSalesperson, ceAmount, ceCompany, ceTitle, ceNotes,
            ceContactPerson, ceJobTitle, ceEmail, ceMobile, ceWhatsapp, cePhone]
            .forEach(el => { if (el) el.value = ""; });

        // Clear items
        if (ceItemsBody) ceItemsBody.innerHTML = "";
        updateCeTotal();
    }
    window.resetCeForm = resetCeForm;

    /* --- Items Logic --- */
    function addCeItemRow() {
        const tr = document.createElement("tr");
        tr.innerHTML = `
             <td><input class="items-row-input ce-item-code" type="text" placeholder="Item Code" /></td>
             <td><input class="items-row-input ce-item-qty" type="number" step="1" value="1" style="width:60px;" /></td>
             <td><input class="items-row-input ce-item-rate" type="number" step="0.01" placeholder="0.00" /></td>
             <td class="text-right ce-item-amt" style="padding-right:10px;">0.00</td>
             <td><button type="button" class="ce-item-del" style="background:none;border:none;color:#991b1b;cursor:pointer;">×</button></td>
           `;

        // Events
        const qty = tr.querySelector(".ce-item-qty");
        const rate = tr.querySelector(".ce-item-rate");
        const del = tr.querySelector(".ce-item-del");

        [qty, rate].forEach(el => el.addEventListener("input", () => updateCeRow(tr)));
        del.addEventListener("click", () => { tr.remove(); updateCeTotal(); });

        ceItemsBody.appendChild(tr);
    }

    function updateCeRow(tr) {
        const qty = parseFloat(tr.querySelector(".ce-item-qty").value) || 0;
        const rate = parseFloat(tr.querySelector(".ce-item-rate").value) || 0;
        const amt = qty * rate;
        tr.querySelector(".ce-item-amt").textContent = formatNumber(amt);
        updateCeTotal();
    }

    function updateCeTotal() {
        let total = 0;
        if (!ceItemsBody) return;
        ceItemsBody.querySelectorAll("tr").forEach(tr => {
            const qty = parseFloat(tr.querySelector(".ce-item-qty").value) || 0;
            const rate = parseFloat(tr.querySelector(".ce-item-rate").value) || 0;
            total += (qty * rate);
        });
        if (ceItemsTotalEl) ceItemsTotalEl.textContent = formatNumber(total);
        if (ceAmount) ceAmount.value = total.toFixed(2);
    }

    if (ceItemsAddBtn) ceItemsAddBtn.addEventListener("click", addCeItemRow);

    /* --- Save Logic --- */
    if (ceSaveBtn) {
        ceSaveBtn.addEventListener("click", async () => {
            if (!ceParty.value) { alert("Please enter a Customer/Party."); return; }
            if (!ceSalesperson.value) { alert("Please enter a Salesperson."); return; }
            if (!ceCompany.value) { alert("Please enter a Company."); return; }

            const payload = {
                doctype: "Opportunity",
                naming_series: ceSeries.value,
                opportunity_from: ceOppFrom.value,
                party_name: ceParty.value,
                customer_name: ceParty.value, // redundant but safe
                custom_salesperson: ceSalesperson.value,
                status: ceStatus.value,
                opportunity_amount: parseFloat(ceAmount.value) || 0,
                currency: ceCurrency.value,
                company: ceCompany.value,
                transaction_date: ceDate.value,
                title: ceTitle.value,
                custom_additional_notes: ceNotes.value,
                // Contacts
                contact_person: ceContactPerson.value,
                contact_email: ceEmail.value,
                contact_mobile: ceMobile.value,
                // Items
                items: []
            };

            // Collect items
            ceItemsBody.querySelectorAll("tr").forEach(tr => {
                payload.items.push({
                    item_code: tr.querySelector(".ce-item-code").value,
                    qty: parseFloat(tr.querySelector(".ce-item-qty").value) || 0,
                    rate: parseFloat(tr.querySelector(".ce-item-rate").value) || 0,
                    amount: (parseFloat(tr.querySelector(".ce-item-qty").value) || 0) * (parseFloat(tr.querySelector(".ce-item-rate").value) || 0)
                });
            });

            ceSaveBtn.disabled = true;
            ceSaveBtn.innerHTML = "<span>Saving...</span>";

            try {
                console.log("Saving Opportunity...", payload);
                if (!window.CURRENT_SYSTEM) throw new Error("Not logged in");

                // ✅ UPDATED: Use Custom Endpoint
                // const res = await callFrappe(window.CURRENT_SYSTEM.baseUrl, "frappe.client.insert", { doc: payload });
                const res = await window.callFrappeSequenced(window.CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.save_omnis_opportunity", { data: JSON.stringify(payload) });

                if (!res.ok) throw new Error(res.error || "Unknown error");

                alert("Opportunity Saved Successfully!");
                resetCeForm();
            } catch (e) {
                console.error("Save Error:", e);
                alert("Error saving opportunity: " + (e.message || e));
            } finally {
                ceSaveBtn.disabled = false;
                ceSaveBtn.innerHTML = "<span class='icon'>💾</span><span>Save</span>";
            }
        });
    }

    /* --- Autocomplete Helpers --- */
    function setupSuggest(input, list, doctype, fieldName = "name", displayField = "") {
        if (!input || !list) return;

        let debounce = null;
        input.addEventListener("input", () => {
            const val = input.value.trim();
            if (val.length < 1) { list.classList.add("hidden"); return; }

            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                // Fetch data
                try {
                    if (!window.CURRENT_SYSTEM) return;
                    list.innerHTML = "<div class='suggest-item'>Searching...</div>";
                    list.classList.remove("hidden");

                    const fieldsToFetch = ["name"];
                    if (displayField) fieldsToFetch.push(displayField);

                    const filters = {};
                    filters[fieldName] = ["like", "%" + val + "%"];

                    const res = await window.callFrappeSequenced(window.CURRENT_SYSTEM.baseUrl, "frappe.client.get_list", {
                        doctype: doctype,
                        fields: fieldsToFetch,
                        filters: filters,
                        limit_page_length: 5
                    });

                    const data = res.message || [];
                    list.innerHTML = "";
                    if (data.length === 0) {
                        list.innerHTML = "<div class='suggest-item'>No results</div>";
                        return;
                    }

                    data.forEach(d => {
                        const div = document.createElement("div");
                        div.className = "suggest-item";
                        let txt = d.name;
                        if (displayField && d[displayField]) txt += ` (${d[displayField]})`;
                        div.textContent = txt;
                        div.addEventListener("click", () => {
                            input.value = d.name;
                            list.classList.add("hidden");
                            // Optional: Trigger change event
                            input.dispatchEvent(new Event('change'));
                            // Specific logic for Customer to auto-fill other fields?
                            if (doctype === "Customer") {
                                // Could auto-fetch contact or currency here if we wanted
                            }
                        });
                        list.appendChild(div);
                    });

                } catch (e) {
                    console.error("Suggest Error:", e);
                    list.innerHTML = "<div class='suggest-item'>Error</div>";
                }
            }, 300);
        });

        // Close on click outside
        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.classList.add("hidden");
            }
        });
    }

    // Wire up Autocompletes
    if (ceParty && cePartySuggest) setupSuggest(ceParty, cePartySuggest, "Customer", "customer_name", "customer_name");
    if (ceSalesperson && ceSalespersonSuggest) setupSuggest(ceSalesperson, ceSalespersonSuggest, "Sales Person", "sales_person_name");
    if (ceCompany && ceCompanySuggest) setupSuggest(ceCompany, ceCompanySuggest, "Company", "company_name");
    if (ceContactPerson && ceContactPersonSuggest) setupSuggest(ceContactPerson, ceContactPersonSuggest, "Contact", "first_name", "email_id");

})();

