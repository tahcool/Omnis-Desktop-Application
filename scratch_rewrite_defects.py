import sys
import re

js_code = """
window._cachedDefectsData = [];

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

    window._cachedDefectsData = res.data;

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
    <div style="padding:20px; background:#f8fafc; position:relative; display:flex; flex-direction:column; gap:20px; height: 100%;">
        
        <!-- Header & Add Defect Search -->
        <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="margin:0; color:#0f172a; font-size:20px; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Order Defects Report
                </h2>
                <div style="display:flex; gap:12px;">
                    <button onclick="window.renderDefectsReport()" style="padding:8px 16px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; font-weight:600;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> Refresh</button>
                    <button onclick="window.printReportContent('Order Defects Report')" style="padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;"><i class="fas fa-print" style="margin-right:6px;"></i> Print PDF</button>
                </div>
            </div>
            
            <div style="display:flex; gap:16px; align-items:center;">
                <div style="flex:1;">
                    <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:6px; display:block;">Search Active Orders to Add Defect</label>
                    <div style="position:relative;">
                        <input type="text" id="add-defect-search" list="active-orders-list" placeholder="Start typing customer or machine..." style="width:100%; padding:10px 10px 10px 36px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;" onchange="window.handleAddDefectSelect(this)">
                        <i class="fas fa-search" style="position:absolute; left:12px; top:12px; color:#94a3b8;"></i>
                        <datalist id="active-orders-list">${datalistOptions}</datalist>
                    </div>
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
        } catch(e) { console.error("Error parsing defect meta", e); }
    }
};

window.renderDefectsReport = function() {
    const container = document.getElementById('defects-report-table-container');
    if (!container) return;

    const companyFilter = document.getElementById('defects-company-filter')?.value || "All";
    const textFilter = (document.getElementById('defects-text-filter')?.value || "").toLowerCase();

    let defects = window._cachedDefectsData || [];

    // Apply Filters
    if (companyFilter !== "All") {
        if (window.olOrdersData) {
            const validOrderIds = new Set(window.olOrdersData.filter(o => {
                const c = o.company || o.frappe_quotation?.company || "";
                return c.includes(companyFilter);
            }).map(o => o.report_id));
            defects = defects.filter(d => validOrderIds.has(d.order_id));
        }
    }

    if (textFilter) {
        defects = defects.filter(d => {
            const cust = (d.customer || d.order_id || "").toLowerCase();
            const mach = (d.machine || "").toLowerCase();
            const desc = (d.description || d.name || "").toLowerCase();
            return cust.includes(textFilter) || mach.includes(textFilter) || desc.includes(textFilter);
        });
    }

    if (defects.length === 0) {
        container.innerHTML = "<div style='padding:60px;text-align:center;color:#64748b;font-size:14px;font-style:italic;'>No active defects match the current filters.</div>";
        return;
    }

    // Group by Customer
    let grouped = {};
    for (let d of defects) {
        let customer = d.customer || d.order_id || 'Unknown';
        if (!grouped[customer]) {
            grouped[customer] = [];
        }
        grouped[customer].push(d);
    }

    let html = `
    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
        <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; position:sticky; top:0; z-index:10; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <tr>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:30%;">Machine</th>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:55%;">Defect Description</th>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Date / Actions</th>
            </tr>
        </thead>
        <tbody>`;

    const customers = Object.keys(grouped).sort();
    
    for (let customer of customers) {
        let custDefects = grouped[customer];
        
        // Render Customer Header Row
        html += `
            <tr style="background:#f8fafc; border-top:2px solid #cbd5e1; border-bottom:1px solid #e2e8f0;">
                <td colspan="3" style="padding:14px 16px; font-weight:800; font-size:14px; color:#0f172a; text-transform:uppercase;">
                    <i class="fas fa-building" style="color:#94a3b8; margin-right:8px;"></i> ${escapeHtml(customer)}
                </td>
            </tr>
        `;

        // Render defects under customer
        for (let d of custDefects) {
            let desc = (d.description || d.name || 'No Description').trim().replace(/\\n/g, '<br>');
            let date = d.start_date || (d.created_at ? d.created_at.substring(0, 10) : '-');
            let machine = d.machine || '-';
            
            html += `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='white'">
                <td style="padding:14px 16px; font-weight:600; color:#334155; vertical-align:top; border-right:1px solid #f1f5f9;">${escapeHtml(machine)}</td>
                <td style="padding:14px 16px; color:#991b1b; vertical-align:top;">${desc}</td>
                <td style="padding:14px 16px; vertical-align:top;">
                    <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-start;">
                        <span style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:4px 8px; border-radius:4px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${date}</span>
                        <button onclick="window.salestrack.openDefectsModal('${escapeHtml(machine).replace(/'/g, "\\'")}', '${escapeHtml(d.order_id).replace(/'/g, "\\'")}', '${escapeHtml(customer).replace(/'/g, "\\'")}')" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:4px 10px; font-size:11px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#fff'; this.style.borderColor='#cbd5e1';"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </td>
            </tr>
            `;
        }
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
};
"""

with open(r'c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r"window\.openDefectsReport = async function\(\) \{.*?\n\};\n*", re.DOTALL)
content = pattern.sub(js_code, content)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Defects Report JS logic successfully replaced.")
