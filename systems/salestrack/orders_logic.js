
/* =========================================
   ORDERS LIST LOGIC (Global Tab)
   ========================================= */

// State for Orders List
let olOrdersData = [];
let olOrdersSort = { col: "days_left", asc: true };
let olOrdersFilter = {};
let olPage = 1;
let olRowsPerPage = 20;

// Initialize Defaults
function initOrdersLogic() {
    if (window._ordersLogicInitialized) return;
    window._ordersLogicInitialized = true;

    console.log("[OrdersLogic] Initializing UI Bindings...");

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);

    const fStart = document.getElementById("ol-from-date");
    const fEnd = document.getElementById("ol-to-date");

    if (fStart && !fStart.value) fStart.valueAsDate = start;
    if (fEnd && !fEnd.value) fEnd.valueAsDate = today;

    // Bind Filters - Scoped to the Order Tracking view to avoid conflicts
    const filterContainer = document.getElementById("ol-orders-filters");
    if (filterContainer) {
        filterContainer.querySelectorAll("input, select").forEach(inp => {
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

    if (companyFilter) companyFilter.addEventListener("change", () => {
        if (typeof syncCompanyFilters === "function") syncCompanyFilters('ol-company', 'mxg-company-filter');
        if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
        loadOrdersList(true);
    });
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
        const base = sys.baseUrl.replace(/\/$/, "");
        const method = "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report";
        const isUnassigned = company.toLowerCase() === 'unassigned';
        // ALWAYS fetch All Companies from Frappe to bypass strict backend SQL matching.
        // We will do all filtering on the frontend so dirty data (like "Sinopower ") is caught!
        const args = {
            company: '',
            from_date: fromDate,
            to_date: toDate
        };

        console.log("[OrdersLogic] Fetching orders with filters:", args);

        const res = await window.callFrappeSequenced(base, method, args);
        console.log("[OrdersLogic] Received response:", res);
        const data = res.message || res;
        
        if (data && data.meta) {
            console.log("[OrdersLogic] Diagnostic DB Counts:", {
                total_fmb: data.meta.debug_fmb_count,
                total_fmb_machine: data.meta.debug_fmb_machine_count
            });
        }

        if (data && data.current_orders) {
            let ordersList = data.current_orders;
            
            // Augment with Supabase Payment Terms status & Company
            // Track which orders have a Supabase company override — these are the source of truth
            const supabaseAssigned = new Set();
            try {
                let sbRes = await window.electron.invoke('supabase:query', {
                    table: 'fmb_reports', method: 'select', params:{columns:'frappe_id, is_payment_terms, company'}
                });
                if(sbRes.ok && sbRes.data) {
                    const termsSet = new Set(sbRes.data.filter(d => d.is_payment_terms === true || d.is_payment_terms === 'true').map(d => d.frappe_id));
                    const compMap = new Map();
                    sbRes.data.forEach(d => { if (d.company) compMap.set(d.frappe_id, d.company); });
                    
                    ordersList.forEach(o => {
                        o.is_payment_terms = termsSet.has(o.report_id);
                        if (compMap.has(o.report_id)) {
                            o.company = compMap.get(o.report_id);
                            supabaseAssigned.add(o.report_id); // Mark as Supabase-sourced
                        }
                    });
                }
            } catch(e) { console.error('[OrdersLogic] Failed to augment terms from Supabase', e); }

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
                if (cl.includes("machinery exchange") || cl === "machinery") return "Machinery Exchange";
                if (cl.includes("sinopower")) return "Sinopower";
                return "Unassigned";
            };

            // Only normalize orders NOT already assigned by Supabase (Supabase is source of truth)
            ordersList.forEach(o => {
                if (!supabaseAssigned.has(o.report_id)) {
                    o.company = normalizeCompany(o.company);
                }
            });

            if (window.appendMissingCompanyFilters) {
                const frappeCompanies = [...new Set(data.current_orders.map(o => o.company).filter(Boolean))];
                window.appendMissingCompanyFilters(frappeCompanies);
            }

            if (company && company.toLowerCase() !== 'all') {
                const targetCompany = normalizeCompany(company);
                ordersList = ordersList.filter(o => o.company === targetCompany);
            }
            
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

/* =========================================
   SET ORDER COMPANY (saves to Supabase)
   ========================================= */
window.setOrderCompany = async function(reportId, newCompany, selectEl) {
    const statusEl = document.getElementById('company-status-' + reportId);
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    if (selectEl) selectEl.disabled = true;

    try {
        // Upsert into fmb_reports: create row if not exists, update company if it does
        const res = await window.electron.invoke('supabase:query', {
            table: 'fmb_reports',
            method: 'upsert',
            params: { data: { frappe_id: reportId, company: newCompany }, options: { onConflict: 'frappe_id' } }
        });

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

    container.innerHTML = paginatedRows.map(r => {
        // 1. Determine Risk Level (GSM Style)
        let riskClass = "risk-low";
        let riskLabel = "STABLE";
        let riskIcon = "fa-check-circle";
        let riskColor = "#10b981";

        const daysVal = parseFloat(r.days_left);
        const isValidDays = !isNaN(daysVal);

        if (isValidDays) {
            if (daysVal < 0) {
                riskClass = "risk-high";
                riskLabel = "HIGH RISK";
                riskIcon = "fa-triangle-exclamation";
                riskColor = "#ef4444";
            } else if (daysVal <= 5) {
                riskClass = "risk-medium";
                riskLabel = "MEDIUM DELAY";
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

        const statusBadge = `<span style="display:inline-block; padding:4px 10px; border-radius:99px; font-size:10px; font-weight:800; text-transform:uppercase; ${statusStyle}">${r.status || "PENDING"}</span>`;

        // 3. Company badge colors
        const escapeJs = (s) => (s || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
        const safeReportId = escapeJs(r.report_id);
        const safeMachineId = escapeJs(r.machine_id);
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
        btnHtml += `<button class="btn-text-action" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">DETAILS</button>`;
        // Company selector goes in actions cell
        btnHtml += `
            <div style="margin-top:6px; display:flex; align-items:center; gap:5px;">
              <select
                style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:7px; border:1px solid ${cc.border}; background:${cc.bg}; color:${cc.color}; cursor:pointer; outline:none; width:100%;"
                onchange="window.setOrderCompany('${safeReportId}', this.value, this)"
              >
                <option value="Sinopower"          ${r.company === 'Sinopower'          ? 'selected' : ''}>SPZ</option>
                <option value="Machinery Exchange" ${r.company === 'Machinery Exchange' ? 'selected' : ''}>MXG</option>
                <option value="Unassigned"         ${(!r.company || r.company === 'Unassigned') ? 'selected' : ''}>---</option>
              </select>
              <span id="company-status-${r.report_id}" style="font-size:10px; color:#94a3b8; white-space:nowrap;"></span>
            </div>`;

        return `
          <div class="ai-order-row ${riskClass} ${(r.status || "").toLowerCase().includes("new sale") ? 'is-new-entry' : ''}" data-id="${r.report_id}">
            <div class="ai-order-cell" onclick="window.dashManager.openOrderModal('${safeReportId}', '${safeMachineId}')">
              <span class="cell-label">Customer / Risk</span>
              <div style="font-weight:700; font-size:15px; color:#000000; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${(r.customer || '').replace(/\"/g, '')}">${(r.customer || "-").replace(/\"/g, '')}</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:800; color:${riskColor}">
                <i class="fas ${riskIcon}"></i> ${riskLabel}
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
              <div class="ai-internal-notes-pill">${r.internal_notes || "—"}</div>
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

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_ai_trend_and_prediction_insights", {
            api_key: localStorage.getItem("omnis_openai_key") || ""
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

window.openDefectsReport = async function() {
    if (!window.salestrack || !window.salestrack.openListModal) {
        alert("Modal functionality not ready.");
        return;
    }
    
    window.salestrack.openListModal("Defects Report", "<div style='padding:60px;text-align:center;color:#64748b;font-weight:600;'><i class='fas fa-spinner fa-spin' style='margin-right:10px;'></i> Generating active defects report...</div>", "1000px");

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
        window.salestrack.openListModal("Defects Report", "<div style='padding:40px;text-align:center;color:#ef4444;'>Failed to load defects from database.</div>", "1000px");
        return;
    }

    let defects = res.data;
    if (defects.length === 0) {
        window.salestrack.openListModal("Defects Report", "<div style='padding:60px;text-align:center;color:#64748b;font-size:14px;font-style:italic;'>No active defects or missing items currently reported.</div>", "1000px");
        return;
    }

    let html = `
    <div style="padding:20px; background:#f8fafc;">
        <h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-exclamation-triangle" style="color:#ef4444; margin-right:10px;"></i> Order Defects Report
        </h2>
        <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em;">
                    <tr>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:20%;">Customer / Order</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:25%;">Machine</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0;">Defect Description</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Date Logged</th>
                    </tr>
                </thead>
                <tbody>`;

    for (let d of defects) {
        let desc = (d.description || d.name || 'No Description').trim().replace(/\n/g, '<br>');
        let date = d.start_date || (d.created_at ? d.created_at.substring(0, 10) : '-');
        let customer = d.customer || d.order_id || 'Unknown';
        
        html += `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                <td style="padding:16px; font-weight:700; color:#334155; vertical-align:top;">${customer}</td>
                <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:top;">${d.machine || '-'}</td>
                <td style="padding:16px; color:#991b1b; font-weight:500; vertical-align:top;">
                    <div style="background:#fef2f2; padding:8px 12px; border-radius:6px; border:1px solid #fecaca; display:inline-block; width:100%; box-sizing:border-box;">
                        ${desc}
                    </div>
                </td>
                <td style="padding:16px; vertical-align:top; color:#64748b; font-weight:600;">${date}</td>
            </tr>
        `;
    }

    html += `</tbody></table></div></div>`;
    window.salestrack.openListModal("Defects Report", html, "1200px");
};
