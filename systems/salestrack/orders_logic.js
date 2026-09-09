
/* =========================================
   ORDERS LIST LOGIC (Global Tab)
   ========================================= */

// State for Orders List
let olOrdersData = [];
let olOrdersSort = { col: "days_left", asc: true };
let olOrdersFilter = {};
let olPage = 1;
let olRowsPerPage = 20;
window.olSelectedOrders = new Map(); // track selected report_ids -> {reportId, machineId}

// Initialize Defaults
function initOrdersLogic() {
    if (window._ordersLogicInitialized) return;
    window._ordersLogicInitialized = true;

    console.log("[OrdersLogic] Initializing UI Bindings...");

    const fStart = document.getElementById("ol-from-date");
    const fEnd = document.getElementById("ol-to-date");

    // Start with cleared filters as requested
    if (fStart && !fStart.value) fStart.value = "";
    if (fEnd && !fEnd.value) fEnd.value = "";

    // Bind Filters - Scoped to the Order Tracking view to avoid conflicts
    const filterContainer = document.getElementById("ol-orders-filters");
    if (filterContainer) {
        filterContainer.querySelectorAll("input, select").forEach(inp => {
            if (inp.value) olOrdersFilter[inp.dataset.filter] = inp.value.trim().toLowerCase();
            inp.addEventListener("input", () => {
                olOrdersFilter[inp.dataset.filter] = inp.value.trim().toLowerCase();
                olPage = 1; // Reset to page 1 on filter change
                renderOrdersList();
            });
        });
    }

    // Bind Sort Headers - Specifically for the Order Tracking grid
    const headGrid = document.getElementById("ol-orders-head-grid");
    if (headGrid) {
        headGrid.querySelectorAll("div[data-sort]").forEach(div => {
            div.addEventListener("click", () => {
                const col = div.dataset.sort;
                if (olOrdersSort.col === col) olOrdersSort.asc = !olOrdersSort.asc;
                else olOrdersSort = { col, asc: true };
                renderOrdersList();
            });
        });
    }

    // Bind Top Level Filters (Company & Period)
    const companyFilter = document.getElementById("ol-company");
    const fromFilter = document.getElementById("ol-from-date");
    const toFilter = document.getElementById("ol-to-date");

    if (companyFilter) {
        const savedComp = localStorage.getItem('omnis_orders_company');
        if (savedComp) {
            companyFilter.value = savedComp;
        }
        companyFilter.addEventListener("change", () => {
            localStorage.setItem('omnis_orders_company', companyFilter.value);
            if (typeof syncCompanyFilters === "function") syncCompanyFilters('ol-company', 'mxg-company-filter');
            if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
            loadOrdersList(true);
        });
    }
    if (fromFilter) fromFilter.addEventListener("change", () => {
        if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
        loadOrdersList(true);
    });
    if (toFilter) toFilter.addEventListener("change", () => {
        if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
        loadOrdersList(true);
    });

    // Bind Refresh Button
    const refreshBtn = document.getElementById("ol-refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => loadOrdersList(true));
    }

    // Bind Reset
    const resetBtn = document.getElementById("ol-reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", () => {
        if (filterContainer) {
            filterContainer.querySelectorAll("input, select").forEach(i => i.value = "");
        }
        olOrdersFilter = {};
        olPage = 1;
        renderOrdersList();
    });

    // Bind Pagination
    const prevBtn = document.getElementById("ol-prev-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => {
        if (olPage > 1) {
            olPage--;
            renderOrdersList();
        }
    });

    const nextBtn = document.getElementById("ol-next-btn");
    if (nextBtn) nextBtn.addEventListener("click", () => {
        const total = olOrdersData.length;
        if (olPage * olRowsPerPage < total) {
            olPage++;
            renderOrdersList();
        }
    });

    // Bind Rows Per Page
    const rowsSelect = document.getElementById("ol-rows-per-page");
    if (rowsSelect) {
        rowsSelect.addEventListener("change", () => {
            olRowsPerPage = parseInt(rowsSelect.value) || 20;
            olPage = 1;
            renderOrdersList();
        });
    }
}

// Auto-run if DOM is already ready, otherwise wait
if (document.readyState === "complete" || document.readyState === "interactive") {
    initOrdersLogic();
} else {
    window.addEventListener("DOMContentLoaded", initOrdersLogic);
}
window.initOrdersLogic = initOrdersLogic; // Expose global


async function loadOrdersList(force = false) {
    window.loadOrdersList = loadOrdersList; // Expose globally
    if (!window._ordersLogicInitialized) initOrdersLogic();

    console.log("[OrdersLogic] loadOrdersList called (force=" + force + ")");
    const container = document.getElementById("ol-orders-body");
    const info = document.getElementById("ol-list-info");
    if (!container) {
        console.error("[OrdersLogic] DOM target 'ol-orders-body' missing!");
        return;
    }

    // If already has data and not forcing, just render
    if (!force && olOrdersData.length > 0) {
        renderOrdersList();
        return;
    }

    container.innerHTML = `
        <div style="padding:60px; text-align:center; color:#94a3b8; font-weight:600; font-size:14px; background:white; border-radius:12px; border:1px dotted #cbd5e1;">
          <i class="fas fa-spinner fa-spin" style="margin-right:10px; color:#800000;"></i> Syncing Operational Stream...
        </div>`;
    if (info) info.textContent = "Connecting to Salestrack...";

    const sys = window.CURRENT_SYSTEM;
    if (!sys || !sys.baseUrl) {
        console.warn("[OrdersLogic] No valid sys context");
        container.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444; font-weight:700;">System context timeout. Please re-login.</div>`;
        return;
    }

    const companyEl = document.getElementById("ol-company");
    const fromEl = document.getElementById("ol-from-date");
    const toEl = document.getElementById("ol-to-date");

    const company = companyEl ? companyEl.value : "";
    const fromDate = fromEl ? fromEl.value : "";
    const toDate = toEl ? toEl.value : "";

    if (info) info.innerHTML = `<i class="fas fa-sync fa-spin"></i> Fetching <strong>${company || "All Companies"}</strong>...`;

    try {
        // Fetch all orders from Supabase (Now the Source of Truth) + Group Sales for Lead Times
        let [sbRes, gsRes] = await Promise.all([
            window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'select',
                params: { columns: '*, order_machines(*)' }
            }),
            window.electron.invoke('supabase:query', {
                table: 'group_sales',
                method: 'select',
                params: { columns: 'frappe_id, committed_lead_time, customer, model' }
            })
        ]);

        const getFuzzy = (id) => (id || '').replace(/-\d+$/, '');
        const normStr = (s) => (s || '').toString().toLowerCase().trim();
        
        const ltMap = new Map();
        const ltFuzzy = new Map();
        const ltCustModel = new Map();
        const ltCust = new Map();
        
        if (gsRes && gsRes.ok && gsRes.data) {
            gsRes.data.forEach(d => { 
                if (d.committed_lead_time !== undefined && d.committed_lead_time !== null && d.committed_lead_time !== "" && d.committed_lead_time !== "—") {
                    ltMap.set(d.frappe_id, d.committed_lead_time);
                    ltFuzzy.set(getFuzzy(d.frappe_id), d.committed_lead_time);
                    if (d.customer && d.model) {
                        ltCustModel.set(normStr(d.customer) + '|' + normStr(d.model), d.committed_lead_time);
                    }
                    if (d.customer) {
                        ltCust.set(normStr(d.customer), d.committed_lead_time);
                    }
                }
            });
        }

        let ordersList = [];
        
        if (sbRes.ok && sbRes.data) {
            sbRes.data.forEach(order => {
                const machines = order.order_machines || [];
                
                const fuzzyId = getFuzzy(order.frappe_id);
                const nCust = normStr(order.customer_id || order.customer_name);
                
                let orderBaseLt = null;
                if (ltMap.has(order.frappe_id)) orderBaseLt = ltMap.get(order.frappe_id);
                else if (ltFuzzy.has(fuzzyId)) orderBaseLt = ltFuzzy.get(fuzzyId);
                else if (ltCust.has(nCust)) orderBaseLt = ltCust.get(nCust);

                if (machines.length === 0) {
                    // Create a dummy row so the order still shows up if it has no machines
                    ordersList.push({
                        report_id: order.frappe_id,
                        machine_id: 'NONE-' + order.id,
                        customer: order.customer_id || 'Unknown',
                        machine: 'No Machine Assigned',
                        item: 'Unknown',
                        qty: 0,
                        status: order.status || 'Internal Tracking',
                        notes: '',
                        internal_notes: '',
                        target_handover: null,
                        revised_handover: null,
                        actual_handover: null,
                        order_date: order.order_date,
                        company: order.company || '',
                        is_payment_terms: order.is_payment_terms,
                        is_tracking_only: false,
                        days_left: "-",
                        committed_lead_time: orderBaseLt
                    });
                } else {
                    machines.forEach(m => {
                        let actual_handover = null;
                        let clean_notes = m.notes || '';
                        
                        // Check for injected markers
                        let is_completed = false;
                        if (clean_notes.includes("[ACTUAL_HANDOVER:")) {
                            const match = clean_notes.match(/\[ACTUAL_HANDOVER:([^\]]+)\]/);
                            if (match) {
                                actual_handover = match[1];
                                clean_notes = clean_notes.replace(/\[ACTUAL_HANDOVER:[^\]]+\]\s*/, '');
                                is_completed = true;
                            }
                        }
                        if (clean_notes.includes("[COMPLETED]")) {
                            is_completed = true;
                            clean_notes = clean_notes.replace(/\[COMPLETED\]\s*/, '');
                        }
                        
                        let days_left = 0;
                        let targetDateStr = m.target_date;
                        if (targetDateStr) {
                            const target = new Date(targetDateStr);
                            target.setHours(0,0,0,0);
                            const now = new Date();
                            now.setHours(0,0,0,0);
                            days_left = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
                        } else {
                            days_left = "-";
                        }
                        
                        const nMach = normStr(m.item_code || '');
                        const custModelKey = nCust + '|' + nMach;
                        
                        let finalLt = orderBaseLt;
                        if (ltCustModel.has(custModelKey)) {
                            finalLt = ltCustModel.get(custModelKey);
                        }
                        
                        ordersList.push({
                            report_id: order.frappe_id,
                            machine_id: m.frappe_row_id || m.id,
                            customer: order.customer_id || 'Unknown',
                            machine: m.item_code || 'Unknown Machine', // Can be enriched with item_name later
                            item: m.item_code,
                            qty: m.quantity || 1,
                            status: order.status || 'Internal Tracking',
                            notes: clean_notes,
                            internal_notes: m.internal_notes || '',
                            target_handover: m.target_date,
                            revised_handover: m.revised_date,
                            actual_handover: actual_handover,
                            order_date: order.order_date,
                            company: order.company || '',
                            is_payment_terms: order.is_payment_terms,
                            is_tracking_only: false,
                            days_left: days_left,
                            committed_lead_time: finalLt
                        });
                    });
                }
            });
        }


    if (ordersList.length > 0) {

            // Fetch Defect Counts
            try {
                if (window.electron) {
                    let defRes = await window.electron.invoke('supabase:query', {
                        table: 'ft_defect', method: 'select', params:{columns:'order_id, machine, status', filters: { status: 'Open' }, order: {column: 'created_at', ascending: false}, limit: 5000}
                    });
                    if(defRes.ok && defRes.data) {
                        const defectMap = new Map();
                        // Map by order_id -> array of machines with defects
                        console.log("[OrdersLogic] Raw Defect Data fetched:", JSON.stringify(defRes.data));
                        defRes.data.forEach(d => {
                            if (d.status === 'Open') {
                                if (!defectMap.has(d.order_id)) defectMap.set(d.order_id, []);
                                defectMap.get(d.order_id).push((d.machine || '').trim().toLowerCase());
                            }
                        });
                        
                        console.log("[OrdersLogic] Defect Map by Order ID:", JSON.stringify(Object.fromEntries(defectMap)));
                        
                        ordersList.forEach(o => {
                            let defectCount = 0;
                            if (defectMap.has(o.report_id)) {
                                const machinesWithDefects = defectMap.get(o.report_id);
                                const possibleNames = [
                                    (o.item_name || '').trim().toLowerCase().replace(/\s+/g, ' '),
                                    (o.machine || '').trim().toLowerCase().replace(/\s+/g, ' '),
                                    (o.item || '').trim().toLowerCase().replace(/\s+/g, ' ')
                                ].filter(Boolean);
                                
                                // Count how many defects match any of this row's possible machine names
                                machinesWithDefects.forEach(defectMachine => {
                                    const normDefectMachine = defectMachine.replace(/\s+/g, ' ');
                                    const match = possibleNames.includes(normDefectMachine) || possibleNames.some(n => normDefectMachine.includes(n) || n.includes(normDefectMachine));
                                    console.log(`[OrdersLogic MATCH] order_id: ${o.report_id}, possibleNames: ${JSON.stringify(possibleNames)}, normDefectMachine: "${normDefectMachine}", match: ${match}`);
                                    if (match) {
                                        defectCount++;
                                    }
                                });
                            }
                            console.log(`[OrdersLogic] Mapping order: ${o.report_id} -> defects: ${defectCount}`);
                            o.open_defects_count = defectCount;
                        });
                    }
                }
            } catch(e) { console.error('[OrdersLogic] Failed to augment defects from Supabase', e); }

            const normalizeCompany = (c) => {
                if (!c) return "Unassigned";
                const cl = c.toLowerCase();
                // Check more specific term first to avoid misclassification
                if (cl.includes("machinery exchange") || cl === "machinery" || cl.includes("mxg")) return "Machinery Exchange";
                if (cl.includes("sinopower") || cl.includes("spz")) return "Sinopower";
                return "Unassigned";
            };

            ordersList.forEach(o => {
                o.company = normalizeCompany(o.company);
            });

            if (window.appendMissingCompanyFilters) {
                const frappeCompanies = [...new Set(ordersList.map(o => o.company).filter(Boolean))];
                window.appendMissingCompanyFilters(frappeCompanies);
            }

            if (company && company.toLowerCase() !== 'all') {
                const targetCompany = normalizeCompany(company);
                ordersList = ordersList.filter(o => o.company === targetCompany);
            }
            // Filter out deleted orders locally
            ordersList = ordersList.filter(o => o.status !== 'Deleted' && !localStorage.getItem('deleted_order_' + o.report_id));
            
            // Force recalculate days_left for ALL orders using STRICTLY target_handover
            ordersList.forEach(o => {
                let targetDateStr = o.target_handover || (o.frappe_quotation && o.frappe_quotation.target_handover);
                if (targetDateStr) {
                    const target = new Date(targetDateStr);
                    target.setHours(0,0,0,0);
                    const now = new Date();
                    now.setHours(0,0,0,0);
                    o.days_left = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
                } else {
                    o.days_left = "-";
                }
            });

            olOrdersData = ordersList;

            window.olOrdersData = olOrdersData; // Expose globally for Aftersales
            if (window.dashManager) window.dashManager.ordersData = olOrdersData;
            renderOrdersList();
        } else {
            olOrdersData = [];
            container.innerHTML = `<div style="padding:40px; text-align:center; color:#94a3b8;">No active orders found for this selection.</div>`;
            if (info) info.textContent = "0 records";
        }

    } catch (err) {
        console.error("Orders List Load Error:", err);
        let errorMsg = err.message || "Unknown Network Error";
        if (errorMsg.includes("Failed to fetch") || errorMsg.includes("CORS")) {
            errorMsg = "Sync Interrupted (Network/CORS). Please ensure you are logged in or using the native shell.";
        }
        container.innerHTML = `
            <div style="padding:60px; text-align:center; color:#ef4444; background:#fff1f2; border:1px solid #fecaca; border-radius:12px;">
                <div style="font-size:18px; font-weight:800; margin-bottom:8px;">Operational Sync Interrupted</div>
                <div style="font-size:13px; font-weight:500; opacity:0.8; margin-bottom:20px;">${errorMsg}</div>
                <button onclick="loadOrdersList(true)" style="padding:8px 24px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;">Retry Pulse</button>
            </div>`;
    }
}

window.loadOrdersList = loadOrdersList; // Expose global

window.syncMissingSales = async function() {
    try {
        const sys = window.CURRENT_SYSTEM;
        if (!sys || !sys.baseUrl) {
            if (window.showToast) window.showToast("System context missing. Please re-login.", "error");
            return;
        }

        if (window.showToast) window.showToast("Fetching Group Sales from Frappe...", "info");

        // 1. Fetch Group Sales
        const base = sys.baseUrl.replace(/\/$/, "");
        const salesRes = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_group_sales_list", { start: 0, page_length: 5000 });
        const salesData = salesRes.message ? (salesRes.message.data || salesRes.message) : (salesRes.data || salesRes);
        const sales = (Array.isArray(salesData) ? salesData : []).filter(s => s.docstatus < 2);

        // 2. Fetch Old FMB Reports (Legacy Tracking)
        if (window.showToast) window.showToast("Fetching Legacy Tracking from Frappe...", "info");
        const fmbRes = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report", { company: "all", start: 0, page_length: 5000 });
        const oldOrders = (fmbRes.message ? fmbRes.message.current_orders : fmbRes.current_orders) || [];

        // 3. Fetch existing synced records from Supabase
        const trackRes = await window.electron.invoke('supabase:query', {
            table: 'omnis_tracking_orders', method: 'select', params: { columns: 'linked_sale_name' }
        });
        if (!trackRes.ok) throw new Error(trackRes.error || "Failed to fetch existing tracking orders");
        
        const existingLinks = new Set((trackRes.data || []).map(t => t.linked_sale_name).filter(Boolean));

        // 4. Process Missing Items
        const missingSales = sales.filter(s => !existingLinks.has(s.name));
        const missingOldOrders = oldOrders.filter(o => !existingLinks.has('FMB-' + o.machine_id));

        if (missingSales.length === 0 && missingOldOrders.length === 0) {
            if (window.showToast) window.showToast("No missing sales found. Up to date!", "success");
            return;
        }

        // Prepare data for UI
        window.pendingSyncItems = [];

        // Add missing sales
        for (const sale of missingSales) {
            let targetHandover = null;
            if (sale.committed_lead_time) {
                const match = sale.committed_lead_time.match(/(\d+)/);
                if (match && match[1]) {
                    const weeks = parseInt(match[1]);
                    const orderDate = new Date(sale.order_date || Date.now());
                    orderDate.setDate(orderDate.getDate() + (weeks * 7));
                    targetHandover = orderDate.toISOString().split('T')[0];
                }
            }

            window.pendingSyncItems.push({
                type: 'Group Sale',
                displayType: '<span style="background:#dbeafe; color:#1e40af; padding:4px 8px; border-radius:6px; font-weight:700;">Group Sale</span>',
                data: {
                    linked_sale_name: sale.name,
                    customer: sale.customer || "Unknown",
                    brand: sale.oem || "",
                    model: sale.model || "",
                    machine: `${sale.oem || ''} ${sale.model || ''}`.trim() || "Unknown Machine",
                    qty: sale.qty || 1,
                    status: "New Sale",
                    order_date: sale.order_date,
                    target_handover: targetHandover,
                    committed_lead_time: sale.committed_lead_time || "",
                    company: sale.company || "Unassigned"
                }
            });
        }

        // Add missing old FMB reports
        for (const o of missingOldOrders) {
            let oldSbRes = await window.electron.invoke('supabase:query', {
                table: 'fmb_reports', method: 'select', params: { filters: { frappe_id: o.report_id } }
            });
            let oldSbData = (oldSbRes.data && oldSbRes.data.length > 0) ? oldSbRes.data[0] : {};

            window.pendingSyncItems.push({
                type: 'Legacy Order',
                displayType: '<span style="background:#fef3c7; color:#b45309; padding:4px 8px; border-radius:6px; font-weight:700;">Legacy Order</span>',
                data: {
                    linked_sale_name: 'FMB-' + o.machine_id,
                    customer: o.customer || "Unknown",
                    brand: o.brand || "",
                    model: "",
                    machine: o.machine || "Unknown Machine",
                    qty: o.qty || 1,
                    status: oldSbData.status || o.status || "In Progress",
                    order_date: o.order_date,
                    target_handover: o.target_handover || null,
                    revised_handover: o.revised_handover || null,
                    committed_lead_time: o.committed_lead_time || "",
                    company: oldSbData.company || o.company || "Unassigned",
                    notes: oldSbData.notes || o.notes || "",
                    internal_notes: oldSbData.internal_notes || o.internal_notes || ""
                }
            });
        }

        // Render to UI
        const tbody = document.getElementById('sync-sales-tbody');
        if (!tbody) return;

        let html = '';
        window.pendingSyncItems.forEach((item, index) => {
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; hover: background: #f8fafc;">
                    <td style="padding: 12px; text-align: left;">
                        <input type="checkbox" class="sync-sale-cb" data-idx="${index}" checked style="width: 16px; height: 16px; cursor: pointer;">
                    </td>
                    <td style="padding: 12px; font-size: 11px;">${item.displayType}</td>
                    <td style="padding: 12px; font-size: 13px; font-weight: 600; color: #334155;">${item.data.customer}</td>
                    <td style="padding: 12px; font-size: 13px; font-weight: 600; color: #334155;">${item.data.machine}</td>
                    <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: center;">${item.data.qty}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
        // Update count initially
        updateSyncSalesCount();

        // Add event listeners to checkboxes
        document.querySelectorAll('.sync-sale-cb').forEach(cb => {
            cb.addEventListener('change', updateSyncSalesCount);
        });

        // Open modal
        const modal = document.getElementById('sync-sales-modal');
        if (modal) modal.style.display = 'flex';

    } catch (e) {
        console.error("Sync Sales Error:", e);
        if (window.showToast) window.showToast("Sync Error: " + e.message, "error");
    }
};

window.updateSyncSalesCount = function() {
    const checked = document.querySelectorAll('.sync-sale-cb:checked').length;
    const countEl = document.getElementById('sync-sales-count');
    if (countEl) countEl.innerText = checked;
};

window.toggleAllSyncSales = function(check) {
    document.querySelectorAll('#sync-sales-tbody tr').forEach(row => {
        if (row.style.display !== 'none') {
            const cb = row.querySelector('.sync-sale-cb');
            if (cb) cb.checked = check;
        }
    });
    updateSyncSalesCount();
};

window.closeSyncSalesModal = function() {
    const modal = document.getElementById('sync-sales-modal');
    if (modal) modal.style.display = 'none';
};

window.filterSyncSales = function(query) {
    query = (query || "").toLowerCase();
    const rows = document.querySelectorAll('#sync-sales-tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
            const cb = row.querySelector('.sync-sale-cb');
            if(cb && cb.checked) cb.checked = false;
        }
    });
    updateSyncSalesCount();
};

window.confirmSyncSales = async function() {
    try {
        const checkboxes = document.querySelectorAll('.sync-sale-cb:checked');
        if (checkboxes.length === 0) {
            if (window.showToast) window.showToast("No items selected to sync.", "warning");
            return;
        }

        const indices = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-idx')));
        const itemsToSync = indices.map(idx => window.pendingSyncItems[idx]);

        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.disabled = true;

        let insertedCount = 0;
        for (const item of itemsToSync) {
            let insRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_tracking_orders', method: 'insert', params: { data: item.data }
            });
            if (insRes.ok) insertedCount++;
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
        closeSyncSalesModal();

        if (window.showToast) window.showToast(`Successfully synced ${insertedCount} selected records.`, "success");
        loadOrdersList(true); // Refresh Order Tracking

    } catch (e) {
        console.error("Confirm Sync Error:", e);
        if (window.showToast) window.showToast("Error syncing selected items: " + e.message, "error");
    }
};

/* =========================================
   SET ORDER COMPANY (saves to Supabase)
   ========================================= */
window.setOrderCompany = async function(reportId, newCompany, selectEl) {
    const statusEl = document.getElementById('company-status-' + reportId);
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    if (selectEl) selectEl.disabled = true;

    try {
        let res;
        if (reportId.startsWith('TRACK-')) {
            // Update omnis_tracking_orders
            let dbId = reportId.split('-')[1];
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_tracking_orders',
                method: 'update',
                params: { data: { company: newCompany }, id: dbId }
            });
        } else {
            // Update old fmb_reports
            res = await window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'upsert',
                params: { data: { frappe_id: reportId, company: newCompany }, options: { onConflict: 'frappe_id' } }
            });
        }

        if (res && res.ok !== false) {
            // Update local in-memory data so filter stays correct
            const order = olOrdersData.find(o => o.report_id === reportId);
            if (order) order.company = newCompany;

            // Update dropdown color to match new company
            const colors = {
                'Sinopower':          { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
                'Machinery Exchange': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
                'Unassigned':         { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
            };
            const cc = colors[newCompany] || colors['Unassigned'];
            if (selectEl) {
                selectEl.style.background = cc.bg;
                selectEl.style.color = cc.color;
                selectEl.style.borderColor = cc.border;
            }
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i>'; setTimeout(() => { statusEl.innerHTML = ''; }, 2000); }
        } else {
            throw new Error(res?.error || 'Supabase update failed');
        }
    } catch(e) {
        console.error('[setOrderCompany] Failed:', e);
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-times" style="color:#ef4444;"></i> Failed'; setTimeout(() => { statusEl.innerHTML = ''; }, 3000); }
    } finally {
        if (selectEl) selectEl.disabled = false;
    }
};

window.setOrderStatusInline = async function(reportId, machineId, newStatus, selectEl) {
    if (selectEl) selectEl.disabled = true;
    const originalBorder = selectEl.style.border;
    selectEl.style.border = '2px solid #3b82f6'; // indicate saving

    try {
        let revised = null;
        let notes = null;
        if (window.olOrdersData) {
            const order = window.olOrdersData.find(o => o.machine_id === machineId);
            if (order) {
                revised = order.revised_handover;
                notes = order.notes;
            }
        }

        let res;
        if (reportId.startsWith('TRACK-')) {
            // Update omnis_tracking_orders
            let dbId = reportId.split('-')[1];
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_tracking_orders',
                method: 'update',
                params: { data: { status: newStatus }, id: dbId }
            });
        } else {
            // Update old fmb_reports
            res = await window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'upsert',
                params: { data: { frappe_id: reportId, status: newStatus }, options: { onConflict: 'frappe_id' } }
            });
        }

        if (res && res.ok !== false) {
            // Update local memory
            if (window.olOrdersData) {
                const order = window.olOrdersData.find(o => o.machine_id === machineId);
                if (order) order.status = newStatus;
            }
            selectEl.style.border = '2px solid #10b981';
            
            // Recalculate background and color dynamically based on new status
            let statusStyle = "background:#f1f5f9; color:#64748b;";
            const s = newStatus.toLowerCase();
            if (s.includes("handover") || s.includes("ready") || s.includes("delivered")) statusStyle = "background:#dcfce7; color:#166534;";
            else if (s.includes("delay") || s.includes("issue") || s.includes("on hold")) statusStyle = "background:#fff7ed; color:#9a3412;";
            else if (s.includes("customer to collect")) statusStyle = "background:#f0fdf4; color:#166534;";
            else if (s.includes("awaiting customer")) statusStyle = "background:#fffbeb; color:#92400e;";
            else if (s.includes("in progress") || s.includes("transit") || s.includes("active")) statusStyle = "background:#e0f2fe; color:#075985;";
            else if (s.includes("new sale")) statusStyle = "background:#faf5ff; color:#6b21a8; font-weight:900; box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);";
            
            selectEl.setAttribute('style', `appearance:none; padding:4px 10px; border-radius:99px; font-size:10px; font-weight:800; text-transform:uppercase; cursor:pointer; outline:none; text-align:center; transition:0.2s; border:2px solid #10b981; ${statusStyle}`);
            
            // Remove 'is-new-entry' class from the parent row if it's no longer a new sale
            const rowEls = document.querySelectorAll(`.ai-order-row[data-id="${reportId}"]`);
            rowEls.forEach(rowEl => {
                if (s.includes("new sale")) {
                    rowEl.classList.add("is-new-entry");
                } else {
                    rowEl.classList.remove("is-new-entry");
                }
            });

            if (window.showToast) window.showToast("Status updated", "success");
            setTimeout(() => { selectEl.style.border = '1px solid transparent'; }, 2000);
        } else {
            throw new Error(res?.error || "Failed to update status");
        }
    } catch (e) {
        console.error("Status update error:", e);
        if (window.showToast) window.showToast("Update failed: " + e.message, "error");
        selectEl.style.border = '2px solid #ef4444';
    } finally {
        if (selectEl) selectEl.disabled = false;
    }
};

function renderOrdersList() {
    console.log("[OrdersLogic] renderOrdersList called");
    try {
        const container = document.getElementById("ol-orders-body");
        const info = document.getElementById("ol-list-info");
        if (!container) return;

        // Update Header UI - Specifically target the Orders grid header to avoid GSM collisions
        const headGrid = document.getElementById("ol-orders-head-grid");
        if (headGrid) {
            headGrid.querySelectorAll("div[data-sort]").forEach(div => {
                const col = div.dataset.sort;
                const icon = div.querySelector(".sort-icon");
                if (col === olOrdersSort.col) {
                    div.classList.add("active");
                    if (icon) {
                        icon.className = olOrdersSort.asc ? "fas fa-sort-up sort-icon" : "fas fa-sort-down sort-icon";
                    }
                } else {
                    div.classList.remove("active");
                    if (icon) icon.className = "fas fa-sort sort-icon";
                }
            });
        }

    // 1. Filter
    let rows = olOrdersData.filter(d => {
        for (const k in olOrdersFilter) {
            const term = olOrdersFilter[k];
            if (!term) continue;
            let val = String(d[k] || "").toLowerCase();
            if (!val.includes(term)) return false;
        }
        return true;
    });

    // 2. Sort
    const { col, asc } = olOrdersSort;
    rows.sort((a, b) => {
        let valA = a[col] || "";
        let valB = b[col] || "";

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return asc ? numA - numB : numB - numA;
        }

        if (col.includes("date") || col.includes("handover")) {
            const dateA = new Date(valA || "1900-01-01");
            const dateB = new Date(valB || "1900-01-01");
            return asc ? dateA - dateB : dateB - dateA;
        }

        return asc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    // 4. Update KPI Cards (Based on Filtered Results) - [NEW LOGIC]
    const totalOrders = rows.length;
    let totalScore = 0;
    let countForEfficiency = 0;
    let totalDeliveryDays = 0;
    let deliveryDaysCount = 0;
    let dueSoonCount = 0;
    let riskCount = 0;
    let topClientMap = {};

    rows.forEach(r => {
        // Efficiency Score Calculation
        const targetStr = r.revised_handover || r.target_handover;
        if (targetStr && r.order_date) {
            countForEfficiency++;
            let orderScore = 100;
            
            // Revision Penalty (-3%) - Revisions are common so gentle weighting
            // Track if it was revised by checking if revised_handover field is filled
            if (r.revised_handover) {
                orderScore -= 3;
            }
            
            // Delay Penalty (-5% per day past target/revised date)
            const daysLeft = parseFloat(r.days_left);
            if (!isNaN(daysLeft) && daysLeft < 0) {
                // The longer the delay, the more negative impact
                orderScore -= (Math.abs(daysLeft) * 5);
            }
            
            totalScore += Math.max(0, orderScore);
            
            // Avg Delivery Time (Committed/Target period)
            try {
                const tDate = new Date(targetStr);
                const oDate = new Date(r.order_date);
                const diff = (tDate - oDate) / (1000 * 60 * 60 * 24);
                if (!isNaN(diff) && diff > 0) {
                    totalDeliveryDays += diff;
                    deliveryDaysCount++;
                }
            } catch(e) {}
        }

        // Stats for cards
        const dLeft = parseFloat(r.days_left);
        if (!isNaN(dLeft)) {
            if (dLeft >= 2 && dLeft <= 4) dueSoonCount++;
        }

        // Top Group Client (Active) - Finding client with most active orders in this filter
        if (r.customer) {
            topClientMap[r.customer] = (topClientMap[r.customer] || 0) + 1;
        }
    });

    // Determine Top Client
    let topClient = "--";
    let maxOrders = 0;
    for (const client in topClientMap) {
        if (topClientMap[client] > maxOrders) {
            maxOrders = topClientMap[client];
            topClient = client;
        }
    }

    const efficiency = countForEfficiency > 0 ? Math.round(totalScore / countForEfficiency) : 100;
    const avgDelivery = deliveryDaysCount > 0 ? Math.round(totalDeliveryDays / deliveryDaysCount) : "--";

    // Update the DOM cards
    if (document.getElementById('ol-stat-total')) document.getElementById('ol-stat-total').innerText = totalOrders;
    if (document.getElementById('ol-stat-avg')) document.getElementById('ol-stat-avg').innerText = avgDelivery + (avgDelivery !== "--" ? " Days" : "");
    if (document.getElementById('ol-stat-soon')) document.getElementById('ol-stat-soon').innerText = dueSoonCount;
    
    // Top Client Card
    if (document.getElementById('ol-stat-risk')) {
        document.getElementById('ol-stat-risk').innerText = topClient;
        if (topClient.length > 20) document.getElementById('ol-stat-risk').style.fontSize = "14px";
        else document.getElementById('ol-stat-risk').style.fontSize = "22px";
    }
    if (document.getElementById('ol-stat-risk-sub')) {
        document.getElementById('ol-stat-risk-sub').innerText = maxOrders > 0 ? `${maxOrders} Active Orders` : "Needs Escalation?";
    }

    // Efficiency Card
    if (document.getElementById('ol-stat-efficiency')) {
        document.getElementById('ol-stat-efficiency').innerText = efficiency + "%";
        // Dynamic Color
        if (efficiency >= 85) document.getElementById('ol-stat-efficiency').style.color = "#10b981";
        else if (efficiency >= 70) document.getElementById('ol-stat-efficiency').style.color = "#f59e0b";
        else document.getElementById('ol-stat-efficiency').style.color = "#ef4444";
    }

    // Expose for printing
    window.olFilteredRows = rows;

    // 3. Render (Paginated)
    const total = rows.length;
    const start = (olPage - 1) * olRowsPerPage;
    const end = start + olRowsPerPage;
    const paginatedRows = rows.slice(start, end);

    if (info) info.textContent = `Showing ${Math.min(start + 1, total)}-${Math.min(end, total)} of ${total}`;

    // Update Pagination UI
    const prevBtn = document.getElementById("ol-prev-btn");
    const nextBtn = document.getElementById("ol-next-btn");
    const pageDisp = document.getElementById("ol-page-display");

    if (prevBtn) prevBtn.disabled = olPage === 1;
    if (nextBtn) nextBtn.disabled = end >= total;
    if (pageDisp) pageDisp.textContent = `Page ${olPage} of ${Math.ceil(total / olRowsPerPage) || 1}`;

    if (total === 0) {
        container.innerHTML = `<div style="padding:40px; text-align:center; color:#94a3b8;">No matching records.</div>`;
        return;
    }

    // Ensure global kebab menu closer is active
    if (!window.kebabMenuListenerAdded) {
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.kebab-container')) {
                document.querySelectorAll('.kebab-menu').forEach(m => m.style.display = 'none');
                document.querySelectorAll('.ai-order-row').forEach(row => row.style.zIndex = '1');
            }
        });
        window.kebabMenuListenerAdded = true;
    }

    container.innerHTML = paginatedRows.map((r, index) => {
        // 1. Determine Risk Level (GSM Style)
        let riskClass = "risk-low";
        let riskLabel = "ON TRACK";
        let riskIcon = "fa-check-circle";
        let riskColor = "#10b981";

        const daysVal = parseFloat(r.days_left);
        const isValidDays = !isNaN(daysVal);

        if (isValidDays) {
            if (daysVal < 0) {
                riskClass = "risk-high";
                riskLabel = "LATE";
                riskIcon = "fa-triangle-exclamation";
                riskColor = "#ef4444";
            } else if (daysVal <= 5) {
                riskClass = "risk-medium";
                riskLabel = "POTENTIALLY LATE";
                riskIcon = "fa-clock";
                riskColor = "#f59e0b";
            }
        }

        // 2. Status Badge
        let statusStyle = "background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;";
        const s = (r.status || "").toLowerCase();
        if (s.includes("handover") || s.includes("ready") || s.includes("delivered")) statusStyle = "background:#dcfce7; color:#166534; border:1px solid #bbf7d0;";
        else if (s.includes("delay") || s.includes("issue") || s.includes("on hold")) statusStyle = "background:#fff7ed; color:#9a3412; border:1px solid #ffedd5;";
        else if (s.includes("customer to collect")) statusStyle = "background:#f0fdf4; color:#166534; border:1px solid #dcfce7;";
        else if (s.includes("awaiting customer")) statusStyle = "background:#fffbeb; color:#92400e; border:1px solid #fef3c7;";
        else if (s.includes("in progress") || s.includes("transit") || s.includes("active")) statusStyle = "background:#e0f2fe; color:#075985; border:1px solid #bae6fd;";
        else if (s.includes("new sale")) statusStyle = "background:#faf5ff; color:#6b21a8; border:1px solid #e9d5ff; font-weight:900; box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);";

        const escapeJs = (s) => (s || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
        const safeReportId = escapeJs(r.report_id);
        const safeMachineId = escapeJs(r.machine_id);

        const optStyle = `background:#ffffff; color:#334155; font-weight:600; font-size:12px;`;
        const statusBadge = `<select 
            style="appearance:none; padding:4px 10px; border-radius:99px; font-size:10px; font-weight:800; text-transform:uppercase; cursor:pointer; outline:none; text-align:center; transition:0.2s; border:1px solid transparent; max-width:100%; overflow:hidden; text-overflow:ellipsis; ${statusStyle}"
            onchange="window.setOrderStatusInline('${safeReportId}', '${safeMachineId}', this.value, this)"
            onclick="event.stopPropagation();"
            title="Click to change Phase/Status"
        >
            <option style="${optStyle}" value="New Sale" ${r.status === 'New Sale' ? 'selected' : ''}>New Sale</option>
            <option style="${optStyle}" value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option style="${optStyle}" value="Awaiting Customer" ${r.status === 'Awaiting Customer' ? 'selected' : ''}>Awaiting Customer</option>
            <option style="${optStyle}" value="On Hold" ${r.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
            <option style="${optStyle}" value="Customer to Collect" ${r.status === 'Customer to Collect' ? 'selected' : ''}>Customer to Collect</option>
            <option style="${optStyle}" value="Handed Over" ${r.status === 'Handed Over' ? 'selected' : ''}>Handed Over</option>
            <option style="${optStyle}" value="Delivered" ${r.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option style="${optStyle}" value="Final Inspection" ${r.status === 'Final Inspection' ? 'selected' : ''}>Final Inspection</option>
        </select>`;
        const companyColors = {
            'Sinopower':          { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
            'Machinery Exchange': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
            'Unassigned':         { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
        };
        const cc = companyColors[r.company] || companyColors['Unassigned'];
        const safeCompany = escapeJs(r.company || 'Unassigned');

        let btnHtml = '';
        if (r.is_payment_terms === true) {
            btnHtml += `<span style="display:inline-block; white-space:nowrap; color:#10b981; font-weight:800; font-size:10px; margin-right:8px; border:1px solid #10b981; padding:2px 6px; border-radius:6px; background:#ecfdf5;">ON TERMS</span>`;
        }
        
        // Actions cell kebab menu
        btnHtml += `
            <div class="kebab-container" style="position:relative; display:inline-block; text-align:right;">
                <button onclick="
                    const m = this.nextElementSibling;
                    const isVis = m.style.display==='block';
                    document.querySelectorAll('.kebab-menu').forEach(x=>x.style.display='none');
                    document.querySelectorAll('.ai-order-row').forEach(x=>{ x.style.position='relative'; x.style.zIndex='1'; });
                    const row = this.closest('.ai-order-row');
                    if (row) row.style.zIndex = isVis ? '1' : '99';
                    m.style.display = isVis ? 'none' : 'block';
                    event.stopPropagation();
                " style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer; padding:6px 14px; color:#475569; font-size:14px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                
                <div class="kebab-menu" style="display:none; position:absolute; right:0; top:100%; margin-top:6px; background:white; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.2); z-index:99; min-width:160px; text-align:left; overflow:hidden;">
                    <div style="padding:8px 12px; border-bottom:1px solid #f1f5f9; background:#f8fafc; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Assigned Co.</div>
                    <div style="padding:6px;">
                        <select
                            style="font-size:11px; font-weight:700; padding:6px; border-radius:6px; border:1px solid ${cc.border}; background:${cc.bg}; color:${cc.color}; cursor:pointer; outline:none; width:100%;"
                            onchange="window.setOrderCompany('${safeReportId}', this.value, this); this.parentElement.parentElement.style.display='none';"
                            onclick="event.stopPropagation();"
                        >
                            <option value="Sinopower"          ${r.company === 'Sinopower'          ? 'selected' : ''}>Sinopower</option>
                            <option value="Machinery Exchange" ${r.company === 'Machinery Exchange' ? 'selected' : ''}>Machinery Exchange</option>
                            <option value="Unassigned"         ${(!r.company || r.company === 'Unassigned') ? 'selected' : ''}>Unassigned</option>
                        </select>
                    </div>
                    <div style="border-top:1px solid #f1f5f9;"></div>
                    <button onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}'); this.parentElement.style.display='none';" style="width:100%; text-align:left; background:transparent; border:none; padding:10px 12px; font-size:13px; font-weight:600; color:#3b82f6; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='transparent'"><i class="fas fa-edit" style="width:18px; text-align:center; margin-right:4px;"></i> Edit Order</button>
                    <button onclick="window.olSelectedOrders = new Map(); window.olSelectedOrders.set('${safeReportId}', {reportId: '${safeReportId}', machineId: '${safeMachineId}'}); window.bulkDeleteOrders(); this.parentElement.style.display='none';" style="width:100%; text-align:left; background:transparent; border:none; padding:10px 12px; font-size:13px; font-weight:600; color:#ef4444; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'"><i class="fas fa-trash" style="width:18px; text-align:center; margin-right:4px;"></i> Delete</button>
                </div>
            </div>
            <div id="company-status-${r.report_id}" style="font-size:10px; color:#94a3b8; white-space:nowrap; text-align:right; margin-top:4px;"></div>
        `;

        const isChecked = window.olSelectedOrders && window.olSelectedOrders.has(r.report_id) ? 'checked' : '';
        return `
          <div class="ai-order-row ${riskClass} ${(r.status || "").toLowerCase().includes("new sale") ? 'is-new-entry' : ''}" data-id="${r.report_id}">
            <div class="ai-order-cell" style="flex-direction:row; display:flex; gap:10px; align-items:flex-start;">
              <input type="checkbox" class="order-select-cb" value="${safeReportId}" data-machine="${safeMachineId}" style="margin-top:4px; transform:scale(1.2); cursor:pointer;" onclick="event.stopPropagation(); window.toggleOrderSelection(this)" ${isChecked}>
              <span style="font-size:12px; font-weight:800; color:#94a3b8; margin-top:2px; min-width:24px; display:inline-block;">${start + index + 1}.</span>
              <div style="flex:1;" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
                <span class="cell-label">Customer / Risk</span>
                <div style="font-weight:700; font-size:15px; color:#000000; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${(r.customer || '').replace(/\"/g, '')}">${(r.customer || "-").replace(/\"/g, '')}</div>
                ${r.is_tracking_only ? `<div style="margin-bottom:6px;"><span style="background:#f59e0b; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; letter-spacing:0.02em;">INTERNAL TRACKING</span></div>` : ''}
                <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:800; color:${riskColor}">
                  <i class="fas ${riskIcon}"></i> ${riskLabel}
                  <div style="margin-left:auto; display:flex; gap:6px;">
                     <i id="notified_wa_icon_${r.report_id}" class="fab fa-whatsapp" style="color:#25d366; font-size:13px; display:${localStorage.getItem('notified_wa_'+r.report_id) ? 'inline-block' : 'none'};" title="WhatsApp Update Sent"></i>
                     <i id="notified_email_icon_${r.report_id}" class="fas fa-envelope" style="color:#0284c7; font-size:13px; display:${localStorage.getItem('notified_email_'+r.report_id) ? 'inline-block' : 'none'};" title="Email Update Sent"></i>
                  </div>
                </div>
              </div>
            </div>


            <div class="ai-order-cell" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Machine Product</span>
              <div style="font-weight:800; font-size:14px; color:#000000; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${(r.machine || '').replace(/\"/g, '')}">${(r.machine || "-").replace(/\"/g, '')}</div>
              ${r.open_defects_count > 0 ? `<div style="margin-top:4px; font-size:10px; font-weight:800; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-exclamation-triangle"></i> ${r.open_defects_count} Defect${r.open_defects_count > 1 ? 's' : ''}</div>` : ''}
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Qty</span>
              <div style="font-weight:800; font-size:15px; color:#000000;">${r.qty || "1"}</div>
            </div>

            <div class="ai-order-cell" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Status</span>
              <div>${statusBadge}</div>
            </div>

            <div class="ai-order-cell" 
                 title="Double-click to edit notes"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'notes', '${escapeJs(r.notes)}')">
              <span class="cell-label">Notes</span>
              <div style="font-size:14px; color:#000000; font-weight:500; line-height:1.4; word-break:break-word;">${r.notes || "—"}</div>
            </div>

            <div class="ai-order-cell" 
                 title="Double-click to edit internal notes"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'internal_notes', '${escapeJs(r.internal_notes)}')">
              <span class="cell-label">Internal Notes</span>
              <div class="ai-internal-notes-pill">
                  ${r.internal_notes ? 
                      '<ul style="margin:0; padding-left:16px; text-align:left;">' + 
                      r.internal_notes.split('\n').filter(p => p.trim() !== '').map(p => '<li>' + p.trim() + '</li>').join('') + 
                      '</ul>' 
                      : "—"}
              </div>
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Committed LT</span>
              <div style="font-size:13px; color:#000000; font-weight:800;">${r.committed_lead_time || "—"}</div>
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Target Date</span>
              <div style="font-size:14px; color:#000000; font-weight:800;">${r.target_handover || "—"}</div>
            </div>

            <div class="ai-order-cell" style="text-align:center;"
                 title="Double-click to edit revised date"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'revised_handover_date', '${escapeJs(r.revised_handover)}')">
              <span class="cell-label">Revised Date</span>
              <div style="font-size:14px; color:#4f46e5; font-weight:700;">${r.revised_handover || "—"}</div>
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Days Left</span>
              <div style="font-size:20px; font-weight:800; color:${riskColor};">${r.days_left || "0"}</div>
            </div>

            <div class="ai-order-cell ai-order-row-actions" style="text-align:right;">
              ${btnHtml}
            </div>
          </div>
        `;
    }).join("");
    } catch (err) {
        console.error("Orders Render Error:", err);
        const container = document.getElementById("ol-orders-body");
        if (container) {
            container.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444; font-weight:600;">Display Engine Failure<br><span style="font-size:11px; font-weight:400; opacity:0.8;">${err.message}</span></div>`;
        }
    }
}

/* =========================================
   BULK SELECTION LOGIC
   ========================================= */
window.toggleOrderSelection = function(cb) {
    if (!window.olSelectedOrders) window.olSelectedOrders = new Map();
    const reportId = cb.value;
    const machineId = cb.dataset.machine;
    if (cb.checked) {
        window.olSelectedOrders.set(reportId, { reportId, machineId });
    } else {
        window.olSelectedOrders.delete(reportId);
    }
    window.updateBulkActionBar();
}

window.updateBulkActionBar = function() {
    let bar = document.getElementById('ol-bulk-action-bar');
    if (!bar) {
        const headGrid = document.getElementById('ol-orders-head-grid');
        if (headGrid && headGrid.parentNode) {
            bar = document.createElement('div');
            bar.id = 'ol-bulk-action-bar';
            bar.style.cssText = 'background:#1e293b; color:white; padding:12px 20px; border-radius:12px; margin-bottom:16px; display:none; align-items:center; justify-content:space-between; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);';
            headGrid.parentNode.insertBefore(bar, headGrid);
        }
    }
    if (!bar) return;

    const count = window.olSelectedOrders ? window.olSelectedOrders.size : 0;
    if (count > 0) {
        bar.style.display = 'flex';
        bar.innerHTML = `
            <div style="font-weight:700; font-size:14px;"><i class="fas fa-check-square" style="color:#10b981; margin-right:8px;"></i> ${count} Order${count > 1 ? 's' : ''} Selected</div>
            <div style="display:flex; gap:10px;">
                <button onclick="window.dashManager.showBulkUpdateModal('email')" style="background:#0284c7; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-envelope"></i> Bulk Email</button>
                <button onclick="window.dashManager.showBulkUpdateModal('whatsapp')" style="background:#25d366; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-comment"></i> Bulk WhatsApp</button>
                <button onclick="window.bulkDeleteOrders()" style="background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-trash"></i> Delete</button>
                <button onclick="window.clearOrderSelection()" style="background:rgba(255,255,255,0.1); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer;">Cancel</button>
            </div>
        `;
    } else {
        bar.style.display = 'none';
    }
}

window.clearOrderSelection = function() {
    if (window.olSelectedOrders) window.olSelectedOrders.clear();
    document.querySelectorAll('.order-select-cb').forEach(cb => cb.checked = false);
    window.updateBulkActionBar();
}

window.bulkDeleteOrders = function() {
    if (!window.olSelectedOrders || window.olSelectedOrders.size === 0) return;
    
    const count = window.olSelectedOrders.size;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.75); display:flex; justify-content:center; align-items:center; z-index:999999; backdrop-filter:blur(4px); font-family:"Inter", "Segoe UI", sans-serif; opacity:0; transition:opacity 0.2s ease-out;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:white; border-radius:16px; width:400px; max-width:90%; padding:30px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); text-align:center; transform:scale(0.95); transition:transform 0.2s ease-out;';
    
    modal.innerHTML = `
        <div style="width:64px; height:64px; background:#fee2e2; border-radius:50%; display:flex; justify-content:center; align-items:center; margin:0 auto 20px;">
            <i class="fas fa-exclamation-triangle" style="color:#ef4444; font-size:28px;"></i>
        </div>
        <h2 style="margin:0 0 12px; font-size:22px; font-weight:800; color:#0f172a;">Delete Orders?</h2>
        <p style="margin:0 0 28px; font-size:15px; color:#475569; line-height:1.5;">
            Are you sure you want to permanently delete <strong>${count} selected order(s)</strong>? This action cannot be undone.
        </p>
        <div style="display:flex; justify-content:center; gap:12px;">
            <button id="btn-cancel-delete" style="padding:12px 20px; background:#f1f5f9; color:#334155; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; flex:1; transition:0.2s;">Cancel</button>
            <button id="btn-confirm-delete" style="padding:12px 20px; background:#ef4444; color:white; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; flex:1; box-shadow:0 4px 6px -1px rgba(239,68,68,0.3); transition:0.2s;"><i class="fas fa-trash" style="margin-right:6px;"></i>Delete</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Trigger animations
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    });
    
    const cleanup = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }, 200);
    };

    const cancelBtn = document.getElementById('btn-cancel-delete');
    const confirmBtn = document.getElementById('btn-confirm-delete');

    cancelBtn.addEventListener('click', cleanup);
    cancelBtn.addEventListener('mouseover', function() { this.style.background = '#e2e8f0'; });
    cancelBtn.addEventListener('mouseout', function() { this.style.background = '#f1f5f9'; });
    
    confirmBtn.addEventListener('mouseover', function() { this.style.background = '#dc2626'; });
    confirmBtn.addEventListener('mouseout', function() { this.style.background = '#ef4444'; });

    confirmBtn.addEventListener('click', async () => {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Deleting...';
        confirmBtn.style.opacity = '0.8';
        confirmBtn.style.pointerEvents = 'none';
        cancelBtn.style.pointerEvents = 'none';
        
        try {
            const reportIds = Array.from(window.olSelectedOrders.keys());
            
            // Hide locally immediately
            reportIds.forEach(id => {
                localStorage.setItem('deleted_order_' + id, 'true');
            });

            // Delete from Supabase
            for (const id of reportIds) {
                await window.electron.invoke('supabase:query', {
                    table: 'fmb_reports',
                    method: 'delete',
                    params: { match: { frappe_id: id } }
                });
            }
            
            window.clearOrderSelection();
            if (window.loadOrdersList) window.loadOrdersList(true);
            cleanup();
        } catch (e) {
            console.error("Error bulk deleting orders:", e);
            confirmBtn.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Failed';
            confirmBtn.style.background = '#f59e0b';
            setTimeout(cleanup, 2000);
        }
    });
}

/* =========================================
   AI RISK ANALYSIS LOGIC
   ========================================= */

async function fetchAIRiskAnalysis() {
    const content = document.getElementById("ol-ai-analysis-content");
    const alerts = document.getElementById("ol-ai-risk-alerts");
    const btn = document.getElementById("ol-ai-analyze-btn");

    if (!content || !btn) return;

    btn.disabled = true;
    btn.textContent = "Analyzing...";
    content.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-spinner fa-spin"></i> Correlating active orders with latest industry news...
    </div>`;
    alerts.innerHTML = "";

    try {
        const sys = window.CURRENT_SYSTEM;
        if (!sys) throw new Error("Connection lost. Please refresh.");
        const base = sys.baseUrl.replace(/\/$/, "");

        let apiKey = "";
        if (window.supabase) {
            try {
                const { data: keyData } = await window.supabase.from("omnis_app_settings").select("setting_value").eq("setting_key", "openai_api_key").single();
                apiKey = keyData ? keyData.setting_value : "";
            } catch(e) { console.error("Failed to fetch OpenAI key", e); }
        }

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_ai_trend_and_prediction_insights", {
            api_key: apiKey
        });

        const data = res.message || res;

        if (data.ok) {
            content.innerHTML = `<strong>Market Insights:</strong><br>${data.insights}`;

            if (data.risk_alerts && data.risk_alerts.length > 0) {
                alerts.innerHTML = data.risk_alerts.map(a => {
                    const severityColor = a.severity === "High" ? "#ef4444" : (a.severity === "Medium" ? "#f59e0b" : "#64748b");
                    return `<div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <div style="font-size:13px; font-weight:600; color:#1e1b4b;">${a.order_id} at Risk</div>
                        <div style="font-size:12px; color:#64748b; flex:1; margin: 0 16px;">${a.reason}</div>
                        <span style="background:${severityColor}; color:white; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800;">${a.severity}</span>
                    </div>`;
                }).join("");
            } else {
                alerts.innerHTML = `<div style="color:#10b981; font-weight:600; font-size:13px; margin-top:8px;">✅ No specific order risks detected from news correlation.</div>`;
            }
        } else {
            content.textContent = "AI Analysis failed: " + (data.error || "Unknown error");
        }
    } catch (err) {
        console.error("AI Analysis Error:", err);
        content.textContent = "Error: " + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = "Re-Analyze";
    }
}

// Bind the button (using a dynamic check since DOM may already be loaded)
function bindAiRiskButton() {
    const aiBtn = document.getElementById("ol-ai-analyze-btn");
    if (aiBtn) {
        aiBtn.addEventListener("click", fetchAIRiskAnalysis);
    }
}

// Initialize
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAiRiskButton);
} else {
    bindAiRiskButton();
}


window._cachedDefectsData = [];

window.refreshSTRReportIfOpen = function() {
    const listModal = document.getElementById('dash-generic-modal');
    const titleEl = document.getElementById('dash-generic-title');
    if (listModal && !listModal.classList.contains('hidden') && titleEl && titleEl.innerText.includes('Sales Tracking Report')) {
        window.openSTRReport();
    }
};

window.openDefectsReport = async function() {
    if (!window.salestrack || !window.salestrack.openListModal) {
        alert("Modal functionality not ready.");
        return;
    }
    
    window.salestrack.openListModal("Defects Report", "<div style='padding:60px;text-align:center;color:#64748b;font-weight:600;'><i class='fas fa-spinner fa-spin' style='margin-right:10px;'></i> Generating active defects report...</div>", "1200px");

    let res = await window.electron.invoke('supabase:query', {
        table: 'ft_defect',
        method: 'select',
        params: {
            columns: '*',
            filters: { status: 'Open' },
            order: { column: 'created_at', ascending: false },
            limit: 1000
        }
    });

    if (!res.ok || !res.data) {
        window.salestrack.openListModal("Defects Report", "<div style='padding:40px;text-align:center;color:#ef4444;'>Failed to load defects from database.</div>", "1200px");
        return;
    }

    // Only include defects generated from Order Tracking (must have an order_id)
    window._cachedDefectsData = res.data.filter(d => d.order_id && d.order_id.trim() !== '');

    // Build the Add Defect Datalist Options
    let datalistOptions = '';
    if (window.olOrdersData) {
        window.olOrdersData.forEach(o => {
            const customer = escapeHtml(o.customer_name || 'Unknown');
            if (o.machines && Array.isArray(o.machines)) {
                o.machines.forEach(m => {
                    const machine = escapeHtml(m.item_name || m.machine || m.item || '');
                    const valStr = `${customer} — ${machine}`;
                    const jsonStr = escapeHtml(JSON.stringify({ report_id: o.report_id, customer: customer, machine: machine }));
                    datalistOptions += `<option value="${valStr}" data-meta="${jsonStr}"></option>`;
                });
            } else {
                const valStr = `${customer} — Order ${o.report_id}`;
                const jsonStr = escapeHtml(JSON.stringify({ report_id: o.report_id, customer: customer, machine: 'General' }));
                datalistOptions += `<option value="${valStr}" data-meta="${jsonStr}"></option>`;
            }
        });
    }

    let html = `
    <div style="padding:10px; background:#f8fafc; position:relative; display:flex; flex-direction:column; gap:10px; height: 100%;">
        
        <!-- Header & Add Defect Search -->
        <div style="background:white; border-radius:8px; border:1px solid #e2e8f0; padding:12px; box-shadow:0 2px 4px -1px rgba(0,0,0,0.05);">
            <div style="display:flex; gap:16px; align-items:flex-end;">
                <div style="flex:1;">
                    <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:6px; display:block;">Search Active Orders to Add Defect</label>
                    <div style="position:relative;">
                        <input type="text" id="add-defect-search" list="active-orders-list" placeholder="Start typing customer or machine..." style="width:100%; padding:10px 10px 10px 36px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;" onchange="window.handleAddDefectSelect(this)">
                        <i class="fas fa-search" style="position:absolute; left:12px; top:12px; color:#94a3b8;"></i>
                        <datalist id="active-orders-list">${datalistOptions}</datalist>
                    </div>
                </div>
                <div style="display:flex; gap:12px; margin-bottom: 2px;">
                    <button onclick="window.openDefectsReport()" style="padding:10px 16px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; font-weight:600;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> Refresh</button>
                    <button onclick="window.printReportContent('Order Defects Report')" style="padding:10px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;"><i class="fas fa-print" style="margin-right:6px;"></i> Print PDF</button>
                </div>
            </div>
        </div>

        <!-- Filter Bar -->
        <div style="display:flex; gap:12px; align-items:center;">
            <select id="defects-company-filter" onchange="window.renderDefectsReport()" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:600; min-width:200px; background:white;">
                <option value="All">All Companies</option>
                <option value="Machinery Exchange">Machinery Exchange (MXG)</option>
                <option value="Sinopower">Sinopower (SPZ)</option>
            </select>
            <div style="position:relative; flex:1;">
                <input type="text" id="defects-text-filter" placeholder="Filter current defects by machine, customer or description..." onkeyup="window.renderDefectsReport()" style="width:100%; padding:10px 10px 10px 36px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
                <i class="fas fa-filter" style="position:absolute; left:12px; top:12px; color:#94a3b8;"></i>
            </div>
        </div>

        <!-- Table Container -->
        <div id="defects-report-table-container" style="flex:1; overflow-y:auto; background:white; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
            <!-- Rendered by JS -->
        </div>
    </div>`;

    window.salestrack.openListModal("Defects Report", html, "1200px");
    
    // Fix z-index so it shows over the navbar
    const backdrop = document.getElementById('ol-list-modal-backdrop');
    if (backdrop) backdrop.style.zIndex = '999999';
    
    // Auto-select company from dashboard context if available
    const dashboardCompanyEl = document.getElementById("ol-company");
    if (dashboardCompanyEl) {
        const dCompany = dashboardCompanyEl.value;
        const localCompanyEl = document.getElementById("defects-company-filter");
        if (localCompanyEl && dCompany !== "All") {
            localCompanyEl.value = dCompany;
        }
    }

    setTimeout(() => {
        window.renderDefectsReport();
    }, 100);
};

window.handleAddDefectSelect = function(inputEl) {
    const val = inputEl.value;
    if (!val) return;
    
    const datalist = document.getElementById('active-orders-list');
    if (!datalist) return;
    
    const option = Array.from(datalist.options).find(opt => opt.value === val);
    if (option && option.dataset.meta) {
        try {
            const meta = JSON.parse(option.dataset.meta.replace(/&quot;/g, '"'));
            if (window.salestrack && window.salestrack.openDefectsModal) {
                // Open the defects modal!
                window.salestrack.openDefectsModal(meta.machine, meta.report_id, meta.customer);
                // Clear input so they can search again later
                inputEl.value = '';
            }
        } catch(e) { console.error("Error parsing defect meta", e) };
    }
};

window.triggerEditDefect = function(machine, orderId, customer) {
    try { machine = decodeURIComponent(machine); } catch(e){}
    try { orderId = decodeURIComponent(orderId); } catch(e){}
    try { customer = decodeURIComponent(customer); } catch(e){}
    console.log("Trigger edit:", machine, orderId, customer);
    if (!window.salestrack) {
        alert("System not ready (salestrack missing)");
        return;
    }
    if (!window.salestrack.openDefectsModal) {
        alert("openDefectsModal missing from salestrack");
        return;
    }
    
    // Explicitly unhide the modal overlay just in case!
    const overlay = document.getElementById('defects-modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        // Force high z-index
        overlay.style.zIndex = '9999999';
    } else {
        alert("Error: defects-modal-overlay not found in DOM");
        return;
    }
    
    window.salestrack.openDefectsModal(machine, orderId, customer);
};

window.resolveDefect = async function(defectId) {
    if (!confirm("Are you sure you want to mark this defect as resolved?")) return;
    try {
        if (!window.electron) throw new Error("Electron not available");
        const res = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'update',
            params: { data: { status: 'Closed' }, match: { name: defectId }, skipSelect: true }
        });
        
        if (res.error) throw new Error(res.error);
        
        if (window.showToast) window.showToast("Defect marked as resolved", "success");
        
        // Remove from cached data
        if (window._cachedDefectsData) {
            window._cachedDefectsData = window._cachedDefectsData.filter(d => d.name !== defectId);
        }
        
        // Re-render table
        if (window.openSTRReport) window.openSTRReport();
        
        // Optional: refresh dashboard to update defect counters
        if (window.loadOrdersList) window.loadOrdersList(true);
    } catch(e) {
        console.error("Resolve defect error:", e);
        alert("Error resolving defect: " + e.message);
    }
};

window.renderDefectsReport = function() {
    const container = document.getElementById('defects-report-table-container');
    if (!container) return;

    const companyFilter = document.getElementById('defects-company-filter')?.value || "All";
    const textFilter = (document.getElementById('defects-text-filter')?.value || "").toLowerCase();

    let data = window._cachedDefectsData || [];
    
    // 1. Apply Filters
    if (companyFilter !== "All") {
        if (window.olOrdersData) {
            // Find which orders belong to the selected company
            const validOrderIds = new Set(window.olOrdersData.filter(o => {
                const c = o.company || (o.frappe_quotation ? o.frappe_quotation.company : "") || "";
                return c.toLowerCase().includes(companyFilter.toLowerCase());
            }).map(o => o.report_id));
            
            data = data.filter(d => validOrderIds.has(d.order_id));
        }
    }
    if (textFilter) {
        data = data.filter(d => {
            let m = (d.machine || "").toLowerCase();
            let c = (d.customer || d.order_id || "").toLowerCase();
            let desc = (d.description || d.name || "").toLowerCase();
            return m.includes(textFilter) || c.includes(textFilter) || desc.includes(textFilter);
        });
    }

    // 2. Group by Customer -> Machine
    let grouped = {};
    for (let d of data) {
        let customer = d.customer || d.order_id || 'Unknown Customer';
        if (!grouped[customer]) grouped[customer] = {};
        
        let machine = d.machine || 'General';
        if (!grouped[customer][machine]) grouped[customer][machine] = [];
        
        grouped[customer][machine].push(d);
    }

    // 3. Build HTML Table
    if (Object.keys(grouped).length === 0) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b;">No active defects found.</div>`;
        return;
    }

    let tableHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
        <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
            <tr>
                <th style="padding:10px 12px; color:#475569; font-weight:800; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; width:30%;">Machine</th>
                <th style="padding:10px 12px; color:#475569; font-weight:800; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; width:50%;">Defect Description</th>
                <th style="padding:10px 12px; color:#475569; font-weight:800; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; width:20%;">Date / Actions</th>
            </tr>
        </thead>
        <tbody>
    `;

    for (let customer of Object.keys(grouped).sort()) {
        // Customer Header Row
        tableHtml += `
            <tr style="background:#f1f5f9; border-top:1px solid #cbd5e1; border-bottom:1px solid #cbd5e1;">
                <td colspan="3" style="padding:10px 12px; font-weight:800; color:#0f172a; text-transform:uppercase; font-size:12px;">
                    <i class="fas fa-building" style="color:#94a3b8; margin-right:8px;"></i> ${escapeHtml(customer)}
                </td>
            </tr>
        `;

        let machines = grouped[customer];
        for (let machine of Object.keys(machines).sort()) {
            let defs = machines[machine];
            
            // Render each defect for this machine
            for (let d of defs) {
                let desc = (d.description || d.name || 'No Description').trim().replace(/\n/g, '<br>');
                let date = d.start_date || (d.created_at ? d.created_at.substring(0, 10) : '-');
                
                // Safe JSON encode for arguments to avoid quote hell
                let encMachine = encodeURIComponent(machine).replace(/'/g, "%27");
                let encOrder = encodeURIComponent(d.order_id || '').replace(/'/g, "%27");
                let encCustomer = encodeURIComponent(customer).replace(/'/g, "%27");

                tableHtml += `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='white'">
                <td style="padding:8px 12px; font-weight:600; color:#334155; vertical-align:middle; border-right:1px solid #f1f5f9;">${escapeHtml(machine)}</td>
                <td style="padding:8px 12px; color:#991b1b; vertical-align:middle; font-size:12px;">${desc}</td>
                <td style="padding:8px 12px; vertical-align:middle;">
                    <div style="display:flex; flex-direction:row; gap:8px; align-items:center; justify-content:flex-start;">
                        <span style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:4px 8px; border-radius:4px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${date}</span>
                        <button onclick="window.resolveDefect('${d.name}')" style="background:transparent; border:none; padding:4px; font-size:14px; color:#10b981; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='#10b981'" title="Mark as Resolved"><i class="fas fa-check-circle"></i></button>
                        <button onclick="window.triggerEditDefect(decodeURIComponent('${encMachine}'), decodeURIComponent('${encOrder}'), decodeURIComponent('${encCustomer}'))" style="background:transparent; border:none; padding:4px; font-size:14px; color:#64748b; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" title="Edit Defect"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                </td>
            </tr>
                `;
            }
        }
    }

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
};

function getOrCreateTrainingOverlay() {
    let overlay = document.getElementById('training-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'training-modal-overlay';
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; z-index:9999999; backdrop-filter:blur(4px);';
        overlay.classList.add('hidden');
        overlay.innerHTML = `
            <div style="background:white; width:500px; max-width:90%; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); overflow:hidden; display:flex; flex-direction:column; font-family:'Inter', sans-serif;">
                <div style="padding:16px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:16px; color:#0f172a;"><i class="fas fa-edit" style="color:#0891b2; margin-right:8px;"></i> Edit Training</h3>
                    <button onclick="document.getElementById('training-modal-overlay').classList.add('hidden')" style="background:transparent; border:none; font-size:18px; color:#64748b; cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:20px; display:flex; flex-direction:column; gap:16px;">
                    <input type="hidden" id="edit-training-name">
                    
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="font-size:12px; font-weight:600; color:#475569;">Location</label>
                        <input type="text" id="edit-training-location" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none;" placeholder="Site Name">
                    </div>
                    
                    <div style="display:flex; gap:16px;">
                        <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                            <label style="font-size:12px; font-weight:600; color:#475569;">Training Date</label>
                            <input type="date" id="edit-training-date" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none;">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                            <label style="font-size:12px; font-weight:600; color:#475569;">No. of Operators</label>
                            <input type="number" id="edit-training-operators" min="1" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none;">
                        </div>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="font-size:12px; font-weight:600; color:#475569;">Trainer Name</label>
                        <input type="text" id="edit-training-trainer" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none;" placeholder="John Doe">
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="font-size:12px; font-weight:600; color:#475569;">Status</label>
                        <select id="edit-training-status" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none; background:white;">
                            <option value="Planned">Planned</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                </div>
                <div style="padding:16px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px;">
                    <button onclick="document.getElementById('training-modal-overlay').classList.add('hidden')" style="padding:8px 16px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>
                    <button onclick="window.saveEditedTraining()" style="padding:8px 16px; background:#0891b2; color:white; border:none; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;"><i class="fas fa-save" style="margin-right:6px;"></i> Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

window.triggerEditTraining = function(trainingName) {
    if (!window._cachedTrainingsData) return;
    const t = window._cachedTrainingsData.find(x => x.id === trainingName || x.name === trainingName);
    if (!t) return;
    
    const overlay = getOrCreateTrainingOverlay();
    
    document.getElementById('edit-training-name').value = t.name || '';
    document.getElementById('edit-training-location').value = t.location || '';
    document.getElementById('edit-training-date').value = t.training_date ? t.training_date.substring(0, 10) : '';
    document.getElementById('edit-training-operators').value = t.number_of_operators || 1;
    document.getElementById('edit-training-trainer').value = t.trainer_name || '';
    document.getElementById('edit-training-status').value = t.status || 'Planned';
    
    overlay.classList.remove('hidden');
};

window.saveEditedTraining = async function() {
    const tName = document.getElementById('edit-training-name').value;
    const location = document.getElementById('edit-training-location').value;
    const tDate = document.getElementById('edit-training-date').value;
    const operators = document.getElementById('edit-training-operators').value;
    const trainer = document.getElementById('edit-training-trainer').value;
    const status = document.getElementById('edit-training-status').value;
    
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'ft_operator_training',
            method: 'update',
            params: {
                data: {
                    location: location,
                    training_date: tDate,
                    number_of_operators: parseInt(operators),
                    trainer_name: trainer,
                    status: status
                },
                match: { id: tName },
                skipSelect: true
            }
        });
        
        if (res.error) throw new Error(res.error);
        
        document.getElementById('training-modal-overlay').classList.add('hidden');
        if (window.openTrainingReport) window.openSTRReport();
    } catch(e) {
        console.error(e);
        alert("Error saving training: " + e.message);
    }
};

window.completeTraining = async function(trainingName) {
    if (!confirm("Mark this training as Done?")) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'ft_operator_training',
            method: 'update',
            params: { data: { status: 'Done' }, match: { id: trainingName }, skipSelect: true }
        });
        if (res.error) throw new Error(res.error);
        
        if (window.openTrainingReport) window.openSTRReport();
    } catch(e) {
        alert("Error updating training: " + e.message);
    }
};

window.deleteTraining = async function(trainingName) {
    if (!confirm("Are you sure you want to delete this training? This cannot be undone.")) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'ft_operator_training',
            method: 'delete',
            params: { match: { id: trainingName }, skipSelect: true }
        });
        if (res.error) throw new Error(res.error);
        
        if (window.openTrainingReport) window.openSTRReport();
    } catch(e) {
        alert("Error deleting training: " + e.message);
    }
};


window._cachedTrainingsData = [];
window.openTrainingReport = async function() {
    if (!window.salestrack || !window.salestrack.openListModal) {
        alert("Modal functionality not ready.");
        return;
    }
    
    window.salestrack.openListModal("Training Report", "<div style='padding:60px;text-align:center;color:#64748b;font-weight:600;'><i class='fas fa-spinner fa-spin' style='margin-right:10px;'></i> Generating planned trainings report...</div>", "1000px");

    let res = await window.electron.invoke('supabase:query', {
        table: 'ft_operator_training',
        method: 'select',
        params: {
            columns: '*',
            order: { column: 'training_date', ascending: true },
            limit: 1000
        }
    });

    if (!res.ok || !res.data) {
        window.salestrack.openListModal("Training Report", "<div style='padding:40px;text-align:center;color:#ef4444;'>Failed to load trainings from database.</div>", "1000px");
        return;
    }

    let trainings = res.data;
    window._cachedTrainingsData = trainings;
    
    // Filter by Company dropdown if active
    const tCompanyEl = document.getElementById("ol-company");
    const tSelectedCompany = tCompanyEl ? tCompanyEl.value : "";
    if (tSelectedCompany && tSelectedCompany.toLowerCase() !== "all" && tSelectedCompany.trim() !== "") {
        if (window.olOrdersData) {
            const validOrderIds = new Set(window.olOrdersData.map(o => o.report_id));
            trainings = trainings.filter(t => validOrderIds.has(t.order_id));
        }
    }
    if (trainings.length === 0) {
        window.salestrack.openListModal("Training Report", "<div style='padding:60px;text-align:center;color:#64748b;font-size:14px;font-style:italic;'>No operator trainings currently planned.</div>", "1000px");
        return;
    }

    let html = `
    <div style="padding:20px; background:#f8fafc;">
        <h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-user-graduate" style="color:#0891b2; margin-right:10px;"></i> Planned Operator Trainings
            <button onclick="window.printReportContent('Planned Operator Trainings Report')" style="float:right; padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);"><i class="fas fa-print" style="margin-right:6px;"></i> Print PDF</button>
        </h2>
        <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em;">
                    <tr>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:20%;">Customer / Order</th>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:20%;">Machine</th>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:20%;">Location</th>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:15%;">Trainer</th>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:10%; text-align:center;">Operators</th>
                        <th style="padding:12px 16px; border:1px solid #cbd5e1; width:15%;">Date / Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    for (let t of trainings) {
        let customer = t.customer || t.order_id || 'Unknown';
        
        html += `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#ecfeff'" onmouseout="this.style.background='white'">
                <td style="padding:16px; font-weight:700; color:#334155; vertical-align:middle; border:1px solid #e2e8f0;">${customer}</td>
                <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:middle; border:1px solid #e2e8f0;">${t.machine || '-'}</td>
                <td style="padding:16px; color:#475569; vertical-align:middle;">
                    <i class="fas fa-map-marker-alt" style="color:#ef4444; margin-right:4px;"></i> ${t.location || '-'}
                </td>
                <td style="padding:16px; color:#475569; vertical-align:middle; border:1px solid #e2e8f0;">${t.trainer_name || '-'}</td>
                <td style="padding:16px; color:#0f172a; font-weight:700; text-align:center; vertical-align:middle; border:1px solid #e2e8f0;">${t.number_of_operators || 1}</td>
                <td style="padding:16px; vertical-align:middle;">
                    <div style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                        <span style="font-size:11px; color:#0891b2; font-weight:700; white-space:nowrap; background:#ecfeff; padding:4px 8px; border-radius:4px; border:1px solid #a5f3fc;">
                            <i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${t.training_date ? t.training_date.substring(0, 10) : '-'}
                        </span>
                        <div style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                            <button onclick="window.completeTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:4px; font-size:14px; color:#10b981; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='#10b981'" title="Mark as Done"><i class="fas fa-check-circle"></i></button>
                            <button onclick="window.triggerEditTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:4px; font-size:14px; color:#64748b; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" title="Edit Training"><i class="fas fa-pencil-alt"></i></button>
                            <button onclick="window.deleteTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:4px; font-size:14px; color:#ef4444; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#b91c1c'" onmouseout="this.style.color='#ef4444'" title="Delete Training"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    html += `</tbody></table></div></div>`;
    window.salestrack.openListModal("Training Report", html, "1200px");
};




window.printReportContent = function(title) {
    let container = document.getElementById('dash-generic-body') || document.querySelector('.modal-content') || document.querySelector('.salestrack-modal-body');
    if (!container) {
        alert("Could not find report content.");
        return;
    }
    
    let clone = container.cloneNode(true);
    let btns = clone.querySelectorAll('button');
    btns.forEach(b => b.remove());
    let contentHTML = clone.innerHTML;

    let logoUrl = new URL('../../assets/images/omnis-logo.png', window.location.href).href;

    let win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>${title}</title>
        <style>
            @page { size: landscape; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .no-print { display: none !important; }
            h2 { display: none; } /* Hide the duplicate title from modal */
            .btn, button { display: none !important; }
        </style>
        </head><body>
        <div style="text-align:center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <img src="${logoUrl}" style="height:60px; margin-bottom:15px;" />
            <h1 style="margin: 0; font-size:24px; color: #1e293b;">${title}</h1>
            <div style="font-size:12px; color:#64748b; margin-top:8px;">Generated: ${new Date().toLocaleString()}</div>
        </div>
        ${contentHTML}
        <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
        </script>
        </body></html>
    `);
    win.document.close();
};


window.printMainOrdersReport = function() {
    const rows = window.olFilteredRows || [];
    if (rows.length === 0) {
        alert("No records to print based on current filters.");
        return;
    }

    let logoUrl = new URL('../../assets/images/omnis-logo.png', window.location.href).href;
    const companyEl = document.getElementById("ol-company");
    const selectedCompany = companyEl && companyEl.options[companyEl.selectedIndex] ? companyEl.options[companyEl.selectedIndex].text : "All Companies";

    let tableHtml = `
        <table>
            <thead>
                <tr>
                    <th style="width:5%;">#</th>
                    <th style="width:15%;">Customer</th>
                    <th style="width:35%;">Machinery Details</th>
                    <th style="width:15%;">Target Date</th>
                    <th style="width:15%;">Revised Date</th>
                    <th style="width:15%;">Days Left</th>
                </tr>
            </thead>
            <tbody>
    `;

    let rowIndex = 1;
    for (let r of rows) {
        let machineInfo = r.machine || r.item || '-';
        if (r.qty > 1) {
            machineInfo += ` (x${r.qty})`;
        }
        
        let cleanCustomer = (r.customer || '').replace(/^"|"$/g, '').trim();

        tableHtml += `
            <tr>
                <td style="font-weight:700; color:#64748b;">${rowIndex++}</td>
                <td style="font-weight:600; color:#334155;">${cleanCustomer}</td>
                <td style="color:#475569;">${machineInfo}</td>
                <td style="color:#0f172a;">${r.target_handover || '-'}</td>
                <td style="color:#0f172a;">${r.revised_handover || '-'}</td>
                <td style="color:#0f172a;">${r.days_left !== undefined ? r.days_left : '-'}</td>
            </tr>
        `;
    }
    tableHtml += `</tbody></table>`;

    let win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Orders Report</title>
        <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; color:#475569; }
            .no-print { display: none !important; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header-right { text-align: right; }
        </style>
        </head><body>
        <div class="header-container">
            <div>
                <img src="${logoUrl}" style="height:60px;" />
            </div>
            <div class="header-right">
                <h1 style="margin: 0 0 5px 0; font-size:22px; color: #1e293b;">Active Orders Report</h1>
                <div style="font-size:13px; font-weight:600; color:#475569;">Filtered By: ${selectedCompany} | Status: In progress</div>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">Generated: ${new Date().toLocaleString()} | ${rows.length} Records</div>
            </div>
        </div>
        ${tableHtml}
        <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
        </script>
        </body></html>
    `);
    win.document.close();
};

/* =========================================
   ADD TRACKING ORDER LOGIC
   ========================================= */
window.openAddTrackingModal = function() {
    const modal = document.getElementById('tracking-order-modal');
    if (modal) {
        // Reset fields
        document.getElementById('track-customer').value = '';
        document.getElementById('track-machine').value = '';
        document.getElementById('track-qty').value = '1';
        document.getElementById('track-target').value = '';
        document.getElementById('track-company').value = 'Unassigned';
        document.getElementById('track-notes').value = '';
        modal.style.display = 'flex';
    } else {
        console.error("Modal element 'tracking-order-modal' not found.");
    }
};

window.closeAddTrackingModal = function() {
    const modal = document.getElementById('tracking-order-modal');
    if (modal) modal.style.display = 'none';
};

window.saveTrackingOrder = async function() {
    const customer = document.getElementById('track-customer').value.trim();
    const machine = document.getElementById('track-machine').value.trim();
    const qty = parseInt(document.getElementById('track-qty').value) || 1;
    const target = document.getElementById('track-target').value;
    const company = document.getElementById('track-company').value;
    const notes = document.getElementById('track-notes').value.trim();

    if (!customer || !machine) {
        alert("Please enter Customer Name and Machine/Product.");
        return;
    }

    try {
        const payload = {
            customer: customer,
            machine: machine,
            qty: qty,
            target_handover: target || null,
            company: company,
            notes: notes,
            status: 'Internal Tracking',
            internal_notes: 'Tracking Only'
        };

        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_tracking_orders',
            method: 'insert',
            params: { data: payload }
        });

        if (res && res.ok !== false) {
            window.closeAddTrackingModal();
            if (window.showToast) window.showToast("Tracking Order Added", "success");
            // Reload the list to fetch the new record
            if (window.loadOrdersList) window.loadOrdersList(true);
        } else {
            throw new Error(res?.error || "Failed to insert tracking order");
        }
    } catch (e) {
        console.error("Save Tracking Order Error:", e);
        alert("Error saving tracking order: " + (e.message || e));
    }
};

window.promoteTrackingOrder = function(reportId) {
    if (!reportId || !reportId.startsWith('TRACK-')) return;
    
    // Close the current detail modal
    if (window.salestrack && window.salestrack.closeListModal) {
        window.salestrack.closeListModal();
    }
    
    // Find the tracking order data
    let order = (window.olOrdersData || []).find(o => o.report_id === reportId);
    if (!order) {
        if (window.showToast) window.showToast("Could not find order data locally", "error");
        return;
    }
    
    // Extract the UUID for linking later
    const uuid = reportId.replace('TRACK-', '');
    window._promotingTrackId = uuid;
    
    // Call the showGroupSalesForm to open the modal
    if (typeof window.showGroupSalesForm === 'function') {
        window.showGroupSalesForm(); // Opens as a new record
    } else {
        if (window.showToast) window.showToast("Group Sales Form not available", "error");
        return;
    }
    
    // Pre-fill the form fields
    setTimeout(() => {
        const customerEl = document.getElementById('gs-customer');
        const orderDateEl = document.getElementById('gs-order_date');
        const leadTimeEl = document.getElementById('gs-lead-time');
        const qtyEl = document.getElementById('gs-qty');
        const companyEl = document.getElementById('gs-company');
        const commentsEl = document.getElementById('gs-comments');
        const oemEl = document.getElementById('gs-oem');
        const modelEl = document.getElementById('gs-model');
        
        if (customerEl) customerEl.value = order.customer || '';
        if (orderDateEl && order.order_date) orderDateEl.value = order.order_date;
        if (leadTimeEl && order.committed_lead_time) leadTimeEl.value = order.committed_lead_time;
        if (qtyEl) qtyEl.value = order.qty || 1;
        if (companyEl && order.company) companyEl.value = order.company;
        if (commentsEl && order.notes) commentsEl.value = order.notes;
        
        // Handle Brand/Model if available, else try to split 'machine'
        if (order.brand && oemEl) oemEl.value = order.brand;
        if (order.model && modelEl) modelEl.value = order.model;
        
        if (!order.brand && !order.model && order.machine && oemEl && modelEl) {
            const parts = order.machine.split(' ');
            if (parts.length > 1) {
                oemEl.value = parts[0];
                modelEl.value = parts.slice(1).join(' ');
            } else {
                modelEl.value = order.machine;
            }
        }
        
        if (window.showToast) window.showToast("Please complete the remaining details to promote this order.", "info");
    }, 300);
};



window.openSTRReport = async function() {
    if (!window.salestrack || !window.salestrack.openListModal) {
        alert("Modal functionality not ready.");
        return;
    }
    
    window.salestrack.openListModal("Sales Tracking Report (STR)", "<div style='padding:60px;text-align:center;color:#64748b;font-weight:600;'><i class='fas fa-spinner fa-spin' style='margin-right:10px;'></i> Generating Sales Tracking Report...</div>", "1500px"); // Kept as string for loading // Use larger modal size for KPI style

    let [defectsRes, trainingsRes] = await Promise.all([
        window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'select',
            params: {
                columns: '*',
                filters: { status: 'Open' },
                order: { column: 'created_at', ascending: false },
                limit: 1000
            }
        }),
        window.electron.invoke('supabase:query', {
            table: 'ft_operator_training',
            method: 'select',
            params: {
                columns: '*',
                order: { column: 'training_date', ascending: true },
                limit: 1000
            }
        })
    ]);

    if (!defectsRes.ok || !trainingsRes.ok) {
        window.salestrack.openListModal("Sales Tracking Report (STR)", "<div style='padding:40px;text-align:center;color:#ef4444;'>Failed to load report data from database.</div>", "1200px");
        return;
    }

    let allDefects = defectsRes.data || [];
    // Only include defects generated from Order Tracking (must have an order_id)
    let defects = allDefects.filter(d => d.order_id && d.order_id.trim() !== '');
    
    let trainings = trainingsRes.data || [];
    
    window._cachedDefectsData = defects;
    window._cachedTrainingsData = trainings;
    
    // Filter by Company dropdown if active
    const tCompanyEl = document.getElementById("ol-company");
    const tSelectedCompany = tCompanyEl ? tCompanyEl.value : "";
    let companyLabel = tSelectedCompany && tSelectedCompany !== "All" ? tSelectedCompany : "All Companies";

    const headerTitle = `
        <div id="str-report-header" style="display:flex; align-items:center; gap:15px; width:100%; justify-content:space-between; background: transparent; padding: 0;">
            <span style="font-size:18px; font-weight:800; color:#0f172a;">Sales Tracking Report (STR)</span>
            <div class="no-print" style="display:flex; align-items:center; gap:10px;">
                <select onchange="(async () => { if(document.getElementById('ol-company')) { document.getElementById('ol-company').value = this.value; if(window.loadOrdersList) await window.loadOrdersList(); } window.openSTRReport(); })()" 
                    style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600; color:#334155; outline:none; cursor:pointer; background:white;">
                    <option value="All" ${companyLabel === 'All Companies' ? 'selected' : ''}>All Companies</option>
                    <option value="Machinery Exchange" ${companyLabel === 'Machinery Exchange' ? 'selected' : ''}>Machinery Exchange</option>
                    <option value="Sinopower" ${companyLabel === 'Sinopower Zimbabwe' || companyLabel === 'Sinopower' ? 'selected' : ''}>Sinopower Zimbabwe</option>
                </select>
                <button onclick="window.openSTRReport()" style="padding:6px 12px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button onclick="window.print()" style="padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:12px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
                    <i class="fas fa-print"></i> Print PDF
                </button>
            </div>
        </div>
    `;
    
    if (tSelectedCompany && tSelectedCompany.toLowerCase() !== "all" && tSelectedCompany.trim() !== "") {
        if (window.olOrdersData) {
            const validOrderIds = new Set(window.olOrdersData.map(o => o.report_id));
            defects = defects.filter(d => validOrderIds.has(d.order_id));
            trainings = trainings.filter(t => validOrderIds.has(t.order_id));
        }
    }

    let totalDefects = defects.length;
    let totalTrainings = trainings.length;
    
    // Count machines affected by defects
    let defectMachines = new Set(defects.map(d => d.machine).filter(Boolean)).size;
    // Count machines needing training
    let trainingMachines = new Set(trainings.map(t => t.machine).filter(Boolean)).size;

    let html = `
    <div class="eff-report-container" style="padding:32px; font-family:'Inter', sans-serif; background:white;">
        <style>
            @media print {
                @page { margin: 10mm; size: auto; }
                body > *:not(#dash-generic-modal), #main-view-container, #view-orders-list, .view-page, .ai-order-row { display: none !important; }
                #dash-generic-modal { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; backdrop-filter: none !important; height: auto !important; }
                #dash-modal-inner { width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
                #dash-modal-inner > div:first-child { display: none !important; }
                #dash-generic-body { padding: 0 !important; overflow: visible !important; }
                .eff-report-container { padding: 0 !important; border: none !important; background: white !important; }
                .eff-report-container table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; margin-top: 20px !important; page-break-inside: auto; }
                .eff-report-container tr { page-break-inside: avoid; page-break-after: auto; }
                .eff-report-container th, .eff-report-container td { border: 1px solid black !important; font-size: 10px !important; padding: 6px 8px !important; }
                .eff-summary-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 0 !important; border: 2px solid black !important; background: white !important; margin-bottom: 20px !important; }
                .eff-summary-grid > div { border: 1px solid black !important; padding: 10px !important; }
                .eff-report-container div, .eff-report-container table { box-shadow: none !important; border-radius: 0 !important; }
                .no-print { display: none !important; }
            }
            .str-action-group .str-actions { display: none; gap: 8px; }
            .str-action-group:hover .str-actions { display: flex; }
            .str-action-group:hover .str-dots { display: none; }
        </style>
        
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; border-bottom:1px solid #e2e8f0; padding-bottom:20px;">
            <div style="display:flex; align-items:center; gap:20px;">
                <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" style="height:45px;" alt="Omnis Logo" onerror="this.src='../../assets/images/omnis-logo.png'">
            </div>
            <div style="text-align:right;">
                <div style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-0.03em;">Sales Tracking Report (STR)</div>
                <div style="font-size:18px; color:#64748b; font-weight:500; margin-top:5px;">${companyLabel} &middot; ${new Date().toLocaleString()}</div>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="eff-summary-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1px; background:#e2e8f0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:40px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div style="background:white; padding:24px; text-align:center;">
                <div style="font-size:12px; font-weight:800; color:white; background:#ef4444; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Open Defects</div>
                <div style="font-size:32px; font-weight:900; color:#ef4444;">${totalDefects}</div>
            </div>
            <div style="background:white; padding:24px; text-align:center;">
                <div style="font-size:12px; font-weight:800; color:white; background:#b91c1c; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Affected Machines</div>
                <div style="font-size:32px; font-weight:900; color:#b91c1c;">${defectMachines}</div>
            </div>
            <div style="background:white; padding:24px; text-align:center;">
                <div style="font-size:12px; font-weight:800; color:white; background:#0891b2; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Planned Trainings</div>
                <div style="font-size:32px; font-weight:900; color:#0891b2;">${totalTrainings}</div>
            </div>
            <div style="background:white; padding:24px; text-align:center;">
                <div style="font-size:12px; font-weight:800; color:white; background:#0e7490; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Trainee Machines</div>
                <div style="font-size:32px; font-weight:900; color:#0e7490;">${trainingMachines}</div>
            </div>
        </div>

        
        <!-- STR Explanation -->
        <div class="no-print" style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #0891b2; border-radius:8px; padding:16px 20px; margin-bottom:40px; display:flex; gap:16px; align-items:flex-start;">
            <i class="fa fa-info-circle" style="color:#0891b2; font-size:20px; margin-top:2px;"></i>
            <div style="font-size:13px; color:#475569; line-height:1.6;">
                <h4 style="margin:0 0 8px 0; color:#0f172a; font-size:14px; font-weight:700;">Sales Tracking Overview</h4>
                <p style="margin:0 0 8px 0;">This report combines after-sales defect tracking and operator training into a single consolidated view:</p>
                <ul style="margin:0; padding-left:20px;">
                    <li style="margin-bottom:4px;"><strong>Active Defects:</strong> Logs of reported issues for machinery. Addressing these promptly maintains high customer satisfaction and equipment uptime.</li>
                    <li style="margin-bottom:4px;"><strong>Planned Trainings:</strong> Scheduled operator inductions and machine familiarisation sessions. Completing these ensures safe and correct operation.</li>
                    <li><strong>Action Menu:</strong> Hover over the <i class="fas fa-ellipsis-h" style="margin:0 4px;"></i> icon on any row to mark defects as resolved, edit details, or mark trainings as completed.</li>
                </ul>
            </div>
        </div>

        <!-- DEFECTS SECTION -->

        <h3 style="margin:0 0 15px 0; color:#0f172a; font-size:18px; font-weight:800; letter-spacing:-0.5px;">
            <i class="fas fa-exclamation-triangle" style="color:#ef4444; margin-right:8px;"></i> Active Defects
        </h3>
    `;

    if (defects.length === 0) {
        html += `<div style='padding:40px; text-align:center; color:#64748b; font-size:14px; font-style:italic; background:white; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:40px;'>No active defects currently reported.</div>`;
    } else {
        html += `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:40px; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px; text-align:left;">
                <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                    <tr>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:20%;">Customer</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:20%;">Machine</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:45%;">Defect Description</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:15%;">Date / Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (let d of defects) {
            let cust = (d.customer || d.order_id || 'Unknown Customer').replace(/"/g, '');
            html += `
                <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:8px 12px; font-weight:700; color:#0f172a; vertical-align:middle;">${cust}</td>
                    <td style="padding:8px 12px; color:#475569; font-weight:600; vertical-align:middle;">${d.machine || '-'}</td>
                    <td style="padding:8px 12px; color:#ef4444; font-weight:500; vertical-align:middle; line-height:1.5;">${(d.description || '-').replace(/\n/g, '<br>')}</td>
                    <td style="padding:8px 12px; vertical-align:middle;">
                        <div style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                            <span style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:4px 8px; border-radius:4px;">
                                <i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${d.start_date ? d.start_date.substring(0, 10) : '-'}
                            </span>
                            <div class="no-print str-action-group" style="display:inline-flex; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; cursor:pointer; min-height:24px;">
                                <div class="str-dots" style="color:#64748b; margin:0 auto;"><i class="fas fa-ellipsis-h"></i></div>
                                <div class="str-actions">
                                    <button onclick="window.resolveDefect('${d.name}')" style="background:transparent; border:none; padding:0; font-size:14px; color:#10b981; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='#10b981'" title="Resolve"><i class="fas fa-check-circle"></i></button>
                                    <button onclick="window.triggerEditDefect('${encodeURIComponent(d.machine || '').replace(/'/g, "%27")}', '${encodeURIComponent(d.order_id || '').replace(/'/g, "%27")}', '${encodeURIComponent(d.customer || '').replace(/'/g, "%27")}')" style="background:transparent; border:none; padding:0; font-size:14px; color:#64748b; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
        html += `</tbody></table></div>`;
    }

    html += `
        <!-- TRAININGS SECTION -->
        <h3 style="margin:0 0 15px 0; color:#0f172a; font-size:18px; font-weight:800; letter-spacing:-0.5px;">
            <i class="fas fa-user-graduate" style="color:#0891b2; margin-right:8px;"></i> Planned Operator Trainings
        </h3>
    `;

    if (trainings.length === 0) {
        html += `<div style='padding:40px; text-align:center; color:#64748b; font-size:14px; font-style:italic; background:white; border:1px solid #e2e8f0; border-radius:12px;'>No operator trainings currently planned.</div>`;
    } else {
        html += `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px; text-align:left;">
                <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                    <tr>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:20%;">Customer</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:20%;">Machine</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:20%;">Location</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:15%;">Trainer</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:10%; text-align:center;">Operators</th>
                        <th style="padding:8px 12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; width:15%;">Date / Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (let t of trainings) {
            let customer = (t.customer || t.order_id || 'Unknown').replace(/"/g, '');
            html += `
                <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:8px 12px; font-weight:700; color:#0f172a; vertical-align:middle;">${customer}</td>
                    <td style="padding:8px 12px; font-weight:600; color:#475569; vertical-align:middle;">${t.machine || '-'}</td>
                    <td style="padding:8px 12px; color:#64748b; vertical-align:middle;">
                        <i class="fas fa-map-marker-alt" style="color:#ef4444; margin-right:4px;"></i> ${t.location || '-'}
                    </td>
                    <td style="padding:8px 12px; color:#0f172a; font-weight:600; vertical-align:middle;">${t.trainer_name || '-'}</td>
                    <td style="padding:8px 12px; color:#0f172a; font-weight:800; text-align:center; vertical-align:middle;">${t.number_of_operators || 1}</td>
                    <td style="padding:8px 12px; vertical-align:middle;">
                        <div style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                            <span style="font-size:11px; color:#0891b2; font-weight:700; white-space:nowrap; background:#ecfeff; padding:4px 8px; border-radius:4px;">
                                <i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${t.training_date ? t.training_date.substring(0, 10) : '-'}
                            </span>
                            <div class="no-print str-action-group" style="display:inline-flex; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; cursor:pointer; min-height:24px;">
                                <div class="str-dots" style="color:#64748b; margin:0 auto;"><i class="fas fa-ellipsis-h"></i></div>
                                <div class="str-actions">
                                    <button onclick="window.completeTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:0; font-size:14px; color:#10b981; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='#10b981'" title="Mark as Done"><i class="fas fa-check-circle"></i></button>
                                    <button onclick="window.triggerEditTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:0; font-size:14px; color:#64748b; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" title="Edit Training"><i class="fas fa-pencil-alt"></i></button>
                                    <button onclick="window.deleteTraining('${t.id || t.name}')" style="background:transparent; border:none; padding:0; font-size:14px; color:#ef4444; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#b91c1c'" onmouseout="this.style.color='#ef4444'" title="Delete Training"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
        html += `</tbody></table></div>`;
    }

    html += `
        <div class="no-print" style="margin-top:24px; font-size:11px; color:#94a3b8; text-align:center;">
            Generated via OAI &middot; Omnis SalesTrack &middot; ${new Date().toLocaleString()}
        </div>
    </div>`;
    
    // Pass 1500px to match efficiency report width
    window.salestrack.openListModal(headerTitle, html, "1500px");
};
