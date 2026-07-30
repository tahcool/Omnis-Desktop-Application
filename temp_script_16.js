
(function() {
    let allDeals = [];
    let allInstallments = [];
    let customersList = [];
    let allPendingSetups = [];
    
    // Add logic to refresh view on load
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('ct-new-start').valueAsDate = new Date();
    });

    // Observer to know when the view is switched
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'view-credit-terms' && mutation.target.style.display !== 'none') {
                window.loadCreditTermsDashboard();
            }
            if (mutation.target.id === 'view-rental-defects' && mutation.target.style.display !== 'none') {
                window.loadDefectsTracking();
            }
            if (mutation.target.id === 'view-rental-fleet' && mutation.target.style.display !== 'none') {
                window.loadRentalFleet();
            }
            if (mutation.target.id === 'view-fleet-manager' && mutation.target.style.display !== 'none') {
                window.loadFleetManager();
            }
            if (mutation.target.id === 'view-customer-profiles' && mutation.target.style.display !== 'none') {
                window.loadCustomerProfiles && window.loadCustomerProfiles();
            }
            if (mutation.target.id === 'view-psv' && mutation.target.style.display !== 'none') {
                window.loadPsvList && window.loadPsvList();
            }
        });
    });
    
    setTimeout(() => {
        const view = document.getElementById('view-credit-terms');
        if(view) observer.observe(view, { attributes: true, attributeFilter: ['style'] });
        const viewRD = document.getElementById('view-rental-defects');
        if(viewRD) observer.observe(viewRD, { attributes: true, attributeFilter: ['style'] });
        const viewRF = document.getElementById('view-rental-fleet');
        if(viewRF) observer.observe(viewRF, { attributes: true, attributeFilter: ['style'] });
        const viewFM = document.getElementById('view-fleet-manager');
        if(viewFM) observer.observe(viewFM, { attributes: true, attributeFilter: ['style'] });
        const viewCP = document.getElementById('view-customer-profiles');
        if(viewCP) observer.observe(viewCP, { attributes: true, attributeFilter: ['style'] });
    }, 1000);

    

    // ============================================================
    // RENTAL FLEET
    // ============================================================
    window._rfAllMachines = [];

    window.loadRentalFleet = async function() {
        const grid = document.getElementById('rf-grid');
        if(!grid) return;
        grid.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><br><br>Loading fleet data…</div>';

        try {
            const ftBaseUrl = 'https://fleetrack.machinery-exchange.com';
            // Fetch all machines then filter client-side for SRD
            const res = await window.callFrappeSequenced(ftBaseUrl, 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', {});

            const allRaw = (res?.data || res?.message?.data || []);
            // Filter to SRD only (customer field contains 'Sales and Rental Division')
            const machines = allRaw.filter(m => (m.customer || '').toLowerCase().includes('sales and rental division') || (m.customer || '').toUpperCase() === 'SRD');
            // Cache all machines for Fleet Manager too
            window._fmAllMachines = allRaw;
            window._rfAllMachines = machines;

            if(!machines.length) {
                grid.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;grid-column:1/-1;">No SRD machines found. (Total fetched: ' + allRaw.length + ')</div>';
                return;
            }

            // Metrics
            const warrantyCount = machines.filter(m => m.warranty_status === 'Under Warranty').length;
            const serviceDue = machines.filter(m => (m.hours_remaining_to_service || 0) <= 250 && (m.next_service_hmr || 0) > 0).length;
            // Active defects from defect map
            const activeDefects = window._rdDefectMap ? Object.values(window._rdDefectMap).filter(d => !d.end_date).length : 0;

            document.getElementById('rf-metric-total').innerText = machines.length;
            document.getElementById('rf-metric-warranty').innerText = warrantyCount;
            document.getElementById('rf-metric-service').innerText = serviceDue;
            document.getElementById('rf-metric-defects').innerText = activeDefects;

            window.rfRenderGrid(machines);
        } catch(e) {
            console.error('Rental Fleet load error:', e);
            grid.innerHTML = '<div style="padding:60px;text-align:center;color:#ef4444;grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Failed to load fleet data.</div>';
        }
    };

    // ============================================================
    // FLEET MANAGER – all customers, all machines
    // ============================================================
    window._fmAllMachines = window._fmAllMachines || [];

    window.loadFleetManager = async function() {
        const body = document.getElementById('fm-body');
        if(!body) return;
        body.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><br><br>Loading fleet…</div>';

        try {
            let allMachines = window._fmAllMachines;
            if(!allMachines.length) {
                const ftBaseUrl = 'https://fleetrack.machinery-exchange.com';
                const res = await window.callFrappeSequenced(ftBaseUrl, 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', {});
                allMachines = res?.data || res?.message?.data || [];
                window._fmAllMachines = allMachines;
            }
            if(!allMachines.length) {
                body.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;">No machines found.</div>';
                return;
            }
            window.fmRenderByCustomer(allMachines);
        } catch(e) {
            body.innerHTML = '<div style="padding:60px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load fleet.</div>';
        }
    };

    window.fmFilter = function() {
        const q = (document.getElementById('fm-search')?.value || '').toLowerCase().trim();
        const data = q ? window._fmAllMachines.filter(m =>
            (m.customer||'').toLowerCase().includes(q) ||
            (m.model||'').toLowerCase().includes(q) ||
            (m.sn||'').toLowerCase().includes(q) ||
            (m.fleet_no||'').toLowerCase().includes(q) ||
            (m.location||'').toLowerCase().includes(q)
        ) : window._fmAllMachines;
        window.fmRenderByCustomer(data);
    };

    window.fmRenderByCustomer = function(machines) {
        const body = document.getElementById('fm-body');
        if(!body) return;

        // Group by customer
        const groups = {};
        machines.forEach(m => {
            const cust = m.customer || 'Unassigned';
            if(!groups[cust]) groups[cust] = [];
            groups[cust].push(m);
        });

        const sortedCustomers = Object.keys(groups).sort();

        body.innerHTML = sortedCustomers.map(cust => {
            const ms = groups[cust];
            const warrantyCount = ms.filter(m => m.warranty_status === 'Under Warranty').length;
            const rows = ms.map(m => {
                const modelParts = (m.model || '').split('-');
                const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || '—');
                const hmr = m.current_hmr || 0;
                const hrsLeft = m.hours_remaining_to_service;
                let svcColor = '#10b981';
                if(hrsLeft !== null && hrsLeft !== undefined && (m.next_service_hmr||0) > 0) {
                    if(hrsLeft <= 50) svcColor = '#ef4444';
                    else if(hrsLeft <= 250) svcColor = '#d97706';
                }
                return `<div style="display:grid; grid-template-columns:1.4fr 1fr 1fr 90px 110px 120px; gap:8px; padding:10px 14px; border-bottom:1px solid #f1f5f9; align-items:center; font-size:13px;">
                    <div style="font-weight:700; color:#0f172a;">${modelCode} <span style="font-size:11px; color:#94a3b8; font-weight:400;">${m.oem||''}</span></div>
                    <div style="font-family:monospace; color:#475569; font-size:12px;">${m.sn||m.name}</div>
                    <div style="color:#64748b;">${m.fleet_no||m.mxg_fleet_no||'—'}</div>
                    <div style="font-weight:700; color:#0f172a; text-align:right;">${hmr.toLocaleString()} hrs</div>
                    <div style="text-align:center;">${(m.next_service_hmr||0) > 0 && hrsLeft !== null && hrsLeft !== undefined ? `<span style="color:${svcColor};font-size:12px;font-weight:700;">${hrsLeft <= 0 ? 'OVERDUE' : hrsLeft+'h left'}</span>` : '<span style="color:#94a3b8;font-size:11px;">—</span>'}</div>
                    <div style="text-align:center;"><span style="background:${m.warranty_status==='Under Warranty'?'#d1fae5':'#f1f5f9'};color:${m.warranty_status==='Under Warranty'?'#047857':'#64748b'};font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;">${m.warranty_status==='Under Warranty'?'In Warranty':'Out'}</span></div>
                </div>`;
            }).join('');

            return `<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; margin-bottom:20px;">
                <div style="padding:14px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:15px; font-weight:800; color:#0f172a;">${cust}</div>
                    <div style="display:flex; gap:10px;">
                        <span style="font-size:12px; font-weight:700; color:#1d4ed8;">${ms.length} machine${ms.length!==1?'s':''}</span>
                        ${warrantyCount > 0 ? `<span style="font-size:12px; font-weight:700; color:#047857;">· ${warrantyCount} in warranty</span>` : ''}
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1.4fr 1fr 1fr 90px 110px 120px; gap:8px; padding:8px 14px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Model</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Serial No.</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Fleet No.</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">HMR</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:center;">Service</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:center;">Warranty</div>
                </div>
                ${rows}
            </div>`;
        }).join('');
    };

    // ============================================================
    // CUSTOMER FLEETS (view-customer-profiles)
    // ============================================================
    window._cpAllMachines = [];

    window.loadCustomerProfiles = async function() {
        const body = document.getElementById('cp-body');
        if(!body) return;
        body.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><br><br>Loading fleet data&hellip;</div>';

        try {
            // Reuse cached FT machines if available from Rental or Fleet Manager
            let allMachines = window._fmAllMachines;
            if(!allMachines || !allMachines.length) {
                const ftBaseUrl = 'https://fleetrack.machinery-exchange.com';
                const res = await window.callFrappeSequenced(ftBaseUrl, 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', {});
                allMachines = res?.data || res?.message?.data || [];
                window._fmAllMachines = allMachines;
            }
            window._cpAllMachines = allMachines;

            if(!allMachines.length) {
                body.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;">No machines found in Fleetrack.</div>';
                return;
            }

            // Compute metrics
            const groups = {};
            allMachines.forEach(m => { const c = m.customer || 'Unassigned'; if(!groups[c]) groups[c]=[]; groups[c].push(m); });
            const customerCount = Object.keys(groups).length;
            const warrantyCount = allMachines.filter(m => m.warranty_status === 'Under Warranty').length;
            const serviceDue = allMachines.filter(m => (m.hours_remaining_to_service || 0) <= 250 && (m.next_service_hmr || 0) > 0).length;

            document.getElementById('cp-metric-customers').innerText = customerCount;
            document.getElementById('cp-metric-machines').innerText = allMachines.length;
            document.getElementById('cp-metric-warranty').innerText = warrantyCount;
            document.getElementById('cp-metric-service').innerText = serviceDue;

            window.cpRenderByCustomer(allMachines);
        } catch(e) {
            console.error('Customer Fleets load error:', e);
            body.innerHTML = '<div style="padding:60px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load fleet data.</div>';
        }
    };

    // ============================================================
    // POWERTRACK INTEGRATION — PT data loading + badge updates
    // ============================================================
    const PT_BASE = 'https://powertrack.powerstar.co.zw';
    const PT_METHOD = 'ptz_powertrack.omnis_dashboard.pt_dashboard.get_pt_machines_for_customer';
    window._ptCache = {};   // customer → { machines, ts }

    // Dedicated low-level PT caller — bypasses Salestrack circuit breaker
    async function callPowertrackAPI(method, params) {
        const url = PT_BASE + '/api/method/' + method + '?_s=' + Math.random().toString(36).slice(2);
        // Build form-encoded body (plain params — PT backend uses extract_params to decode)
        const body = new URLSearchParams();
        if (params) Object.entries(params).forEach(([k,v]) => body.append(k, v));

        // 1. Try Electron IPC (works even cross-domain, shares cookies)
        if (window.frappeAPI && window.frappeAPI.request) {
            const res = await window.frappeAPI.request({
                url, method: 'POST', data: Object.fromEntries(body),
                syncCookies: true, timeout: 8000
            });
            if (res && res.ok) {
                const d = res.data;
                return d?.message || d;
            }
            // Auth failure — user needs to log in to PT
            if (res && (res.status === 401 || res.status === 403)) {
                throw new Error('NOT_LOGGED_IN');
            }
            // 404 — wrong server or app DNS not updated (needs restart)
            if (res && res.status === 404) {
                throw new Error('WRONG_SERVER');
            }
            throw new Error('IPC_' + (res?.status || 0));
        }
        // 2. Fetch fallback
        const fr = await fetch(url, {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: body.toString()
        });
        if (fr.status === 401 || fr.status === 403) throw new Error('NOT_LOGGED_IN');
        if (fr.status === 404) throw new Error('WRONG_SERVER');
        if (!fr.ok) throw new Error('HTTP ' + fr.status);
        const json = await fr.json();
        return json?.message || json;
    }

    window.loadCustomerPtData = async function(customers) {
        for (const cust of customers) {
            const cached = window._ptCache[cust];
            // Skip if cached and not an error (errors should retry)
            if (cached && !cached.error) continue;
            try {
                const res = await callPowertrackAPI(PT_METHOD, { customer: cust });
                const machines = res?.machines || [];
                window._ptCache[cust] = { machines, ts: Date.now() };
                window._applyPtBadges(cust, machines);
            } catch(e) {
                // Only cache as error if it's not a network blip; let auth errors retry
                window._ptCache[cust] = { machines: [], ts: Date.now(), error: e.message };
            }
        }
    };

    window._applyPtBadges = function(customer, ptMachines) {
        // Build lookup: reg_number → pt machine, fleet_no → pt machine
        const byReg   = {};
        const byFleet = {};
        ptMachines.forEach(pm => {
            if (pm.reg_number && pm.reg_number !== '—') byReg[pm.reg_number.trim().toUpperCase()]   = pm;
            if (pm.fleet_no   && pm.fleet_no   !== '—') byFleet[pm.fleet_no.trim().toUpperCase()]   = pm;
        });

        // Find all PT badge cells in the DOM
        document.querySelectorAll('[id^="ptb-"]').forEach(cell => {
            const sn    = (cell.dataset.sn    || '').trim().toUpperCase();
            const fleet = (cell.dataset.fleet || '').trim().toUpperCase();
            const pm    = byReg[sn] || byFleet[fleet] || null;
            if (!pm) return;  // no match — leave spinner

            let badge;
            if (pm.pt_status === 'bd_high') {
                badge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:#fee2e2;color:#dc2626;cursor:default;" title="${pm.open_bd_count} open breakdown(s) — ${pm.highest_severity} severity — ${pm.max_days_on_bd} day(s)">
                    <i class="fas fa-circle" style="font-size:6px;"></i> BD HIGH</span>`;
            } else if (pm.pt_status === 'bd_open') {
                badge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:#fef3c7;color:#d97706;cursor:default;" title="${pm.open_bd_count} open breakdown(s)">
                    <i class="fas fa-circle" style="font-size:6px;"></i> BD OPEN</span>`;
            } else {
                badge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:#dcfce7;color:#16a34a;cursor:default;" title="No open breakdowns on Powertrack">
                    <i class="fas fa-circle" style="font-size:6px;"></i> OK</span>`;
            }
            cell.innerHTML = badge;
        });
    };

    // ============================================================
    // POWERTRACK LINK PANEL — open/close/render
    // ============================================================
    window.openPtLinkPanel = async function(customer) {
        const panel    = document.getElementById('pt-link-panel');
        const backdrop = document.getElementById('pt-link-backdrop');
        const custEl   = document.getElementById('pt-panel-customer');
        const kpisEl   = document.getElementById('pt-panel-kpis');
        const bodyEl   = document.getElementById('pt-panel-body');
        const chipEl   = document.getElementById('pt-panel-status-chip');
        const tsEl     = document.getElementById('pt-panel-timestamp');
        if (!panel) return;

        // Decode HTML entities in customer name
        const d = document.createElement('div'); d.innerHTML = customer; const custName = d.textContent;

        custEl.textContent = custName;
        chipEl.textContent = 'Loading…';
        chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(100,116,139,0.2);color:#94a3b8;';
        kpisEl.innerHTML = '';
        bodyEl.innerHTML = `<div style="text-align:center;padding:60px 0;color:#475569;">
            <i class="fas fa-circle-notch fa-spin fa-2x" style="margin-bottom:14px;opacity:0.5;"></i>
            <div style="font-size:13px;">Fetching from Powertrack…</div></div>`;
        panel.style.display = 'flex';
        backdrop.style.display = 'block';
        tsEl.textContent = new Date().toLocaleTimeString();

        
        // --- AUTOMATED WHATSAPP DISPATCHER ---
        if (typeof startWhatsAppAutomatedDispatcher === 'function') {
            startWhatsAppAutomatedDispatcher();
        }

// Load data (use cache if fresh < 3 min)
        let machines = [];
        const cached = window._ptCache[custName];
        if (cached && !cached.error && (Date.now() - cached.ts) < 180000) {
            machines = cached.machines;
        } else {
            try {
                const res = await callPowertrackAPI(PT_METHOD, { customer: custName });
                machines = res?.machines || [];
                window._ptCache[custName] = { machines, ts: Date.now() };
                window._applyPtBadges(custName, machines);
            } catch(e) {
                const isAuth        = e.message === 'NOT_LOGGED_IN';
                const isWrongServer = e.message === 'WRONG_SERVER';
                let title, subtitle, chip;
                if (isAuth) {
                    title    = 'Not logged in to Powertrack';
                    subtitle = 'Please open Powertrack and log in, then try again.';
                    chip     = 'NOT LOGGED IN';
                } else if (isWrongServer) {
                    title    = 'Powertrack connection not ready';
                    subtitle = 'Please fully restart the Omnis app to apply the latest network settings, then try again.';
                    chip     = 'NEEDS RESTART';
                } else {
                    title    = 'Could not reach Powertrack';
                    subtitle = 'Check your network connection or try restarting the app.';
                    chip     = 'OFFLINE';
                }
                bodyEl.innerHTML = `<div style="text-align:center;padding:50px 28px;color:#ef4444;">
                    <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom:14px;"></i>
                    <div style="font-size:15px;font-weight:800;margin-bottom:8px;">${title}</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.6;max-width:340px;margin:0 auto;">${subtitle}</div>
                    <button onclick="window.openPowertrackApp()" style="margin-top:20px;background:#8b2219;color:white;border:none;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
                        <i class="fas fa-external-link-alt"></i> Open Powertrack
                    </button>
                    </div>`;
                chipEl.textContent = chip;
                chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(239,68,68,0.15);color:#ef4444;';
                return;
            }
        }

        // ── KPI strip ────────────────────────────────────────────────
        const totalBd    = machines.filter(m => m.open_bd_count > 0).length;
        const totalHigh  = machines.filter(m => m.pt_status === 'bd_high').length;
        const totalDefects = machines.reduce((s,m) => s + (m.active_defects||0), 0);
        const totalOk    = machines.filter(m => m.pt_status === 'ok').length;

        const kpiItem = (val, label, color) =>
            `<div style="flex:1;text-align:center;padding:12px 8px;border-right:1px solid rgba(255,255,255,0.07);">
                <div style="font-size:22px;font-weight:800;color:${color};">${val}</div>
                <div style="font-size:9px;font-weight:700;color:#475569;text-transform:uppercase;margin-top:2px;">${label}</div>
            </div>`;

        kpisEl.innerHTML =
            kpiItem(machines.length, 'PT Machines', '#e2e8f0') +
            kpiItem(totalOk,         'OK',          '#22c55e') +
            kpiItem(totalBd,         'Open BD',     totalBd ? '#fbbf24' : '#475569') +
            kpiItem(totalHigh,       'High Sev',    totalHigh ? '#ef4444' : '#475569') +
            kpiItem(totalDefects,    'Defects',     totalDefects ? '#f97316' : '#475569');

        // Status chip
        if (!machines.length) {
            chipEl.textContent = 'NOT IN PT';
            chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(100,116,139,0.15);color:#64748b;';
        } else if (totalHigh) {
            chipEl.textContent = `${totalHigh} HIGH SEVERITY`;
            chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(239,68,68,0.15);color:#ef4444;';
        } else if (totalBd) {
            chipEl.textContent = `${totalBd} OPEN BREAKDOWN`;
            chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(251,191,36,0.15);color:#fbbf24;';
        } else {
            chipEl.textContent = 'ALL CLEAR';
            chipEl.style.cssText = 'font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(34,197,94,0.15);color:#22c55e;';
        }

        // ── Machine cards ─────────────────────────────────────────────
        if (!machines.length) {
            bodyEl.innerHTML = `<div style="text-align:center;padding:60px 0;color:#475569;">
                <i class="fas fa-satellite-dish fa-2x" style="margin-bottom:12px;opacity:0.3;"></i>
                <div style="font-size:14px;font-weight:700;color:#64748b;">No Powertrack machines found</div>
                <div style="font-size:12px;margin-top:6px;color:#475569;">This customer may not have machines registered in Powertrack</div></div>`;
            return;
        }

        bodyEl.innerHTML = machines.map(pm => {
            const statusBorder = pm.pt_status === 'bd_high' ? '#ef4444' : pm.pt_status === 'bd_open' ? '#fbbf24' : '#22c55e';
            const statusBg     = pm.pt_status === 'bd_high' ? 'rgba(239,68,68,0.06)' : pm.pt_status === 'bd_open' ? 'rgba(251,191,36,0.06)' : 'rgba(34,197,94,0.04)';

            const bdSection = pm.open_bd_count > 0 ? `
                <div style="margin-top:10px;padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <i class="fas fa-tools" style="color:#ef4444;font-size:11px;"></i>
                        <span style="font-size:11px;font-weight:800;color:#ef4444;text-transform:uppercase;">${pm.open_bd_count} Open Breakdown${pm.open_bd_count>1?'s':''} — ${pm.highest_severity} Severity — ${pm.max_days_on_bd} day${pm.max_days_on_bd!==1?'s':''}</span>
                    </div>
                    ${pm.bd_location !== '—' ? `<div style="font-size:11px;color:#94a3b8;"><span style="color:#64748b;font-weight:700;">Location:</span> ${pm.bd_location}</div>` : ''}
                    ${pm.bd_description !== '—' ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;"><span style="color:#64748b;font-weight:700;">Status:</span> ${pm.bd_description}</div>` : ''}
                </div>` : `<div style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#22c55e;"><i class="fas fa-check-circle"></i> No open breakdowns</div>`;

            const defectSection = pm.active_defects > 0
                ? `<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#f97316;"><i class="fas fa-exclamation-circle"></i> ${pm.active_defects} active defect${pm.active_defects>1?'s':''}</div>`
                : '';

            const svcSection = pm.last_service_date !== '—'
                ? `<div style="margin-top:4px;font-size:11px;color:#64748b;font-weight:600;"><i class="fas fa-wrench" style="margin-right:5px;font-size:10px;"></i>Last service: ${pm.last_service_date}${pm.next_service_reading>0?' · Next: '+pm.next_service_reading.toLocaleString()+' hrs':''}</div>`
                : '';

            return `<div style="background:#1e293b;border:1px solid rgba(255,255,255,0.07);border-left:3px solid ${statusBorder};border-radius:14px;padding:16px 18px;background:${statusBg}background:#1a2744;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                            <span style="font-size:15px;font-weight:800;color:#e2e8f0;">${pm.model}</span>
                            <span style="font-family:monospace;font-size:12px;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:6px;">${pm.lbz}</span>
                            ${pm.fleet_no !== '—' ? `<span style="font-size:11px;font-weight:700;color:#475569;">Fleet: <span style="color:#94a3b8;">${pm.fleet_no}</span></span>` : ''}
                            ${pm.reg_number !== '—' ? `<span style="font-size:11px;font-weight:700;color:#475569;">SN: <span style="color:#94a3b8;">${pm.reg_number}</span></span>` : ''}
                        </div>
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#64748b;margin-bottom:4px;">
                            ${pm.current_reading > 0 ? `<span><span style="color:#94a3b8;font-weight:700;">Reading:</span> ${pm.current_reading.toLocaleString()} hrs</span>` : ''}
                            ${pm.location !== '—' ? `<span><span style="color:#94a3b8;font-weight:700;">Location:</span> ${pm.location}</span>` : ''}
                            ${pm.engine_type !== '—' ? `<span><span style="color:#94a3b8;font-weight:700;">Engine:</span> ${pm.engine_type}</span>` : ''}
                        </div>
                        ${bdSection}
                        ${defectSection}
                        ${svcSection}
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    window.closePtLinkPanel = function() {
        const panel    = document.getElementById('pt-link-panel');
        const backdrop = document.getElementById('pt-link-backdrop');
        if (panel)    panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
    };

    window.openPowertrackApp = function() {
        // Navigate to Powertrack inside Omnis shell
        if (window.navigateToSystem) { window.navigateToSystem('powertrack'); return; }
        // Fallback: switch primary system
        const ptBtn = document.querySelector('[data-system="powertrack"]') || document.querySelector('[onclick*="powertrack"]');
        if (ptBtn) { ptBtn.click(); return; }
        // Last resort: open in new window
        window.open('https://powertrack.powerstar.co.zw', '_blank');
    };

    window.cpFilter = function() {
        const q = (document.getElementById('cp-search')?.value || '').toLowerCase().trim();
        const data = q ? window._cpAllMachines.filter(m =>
            (m.customer||'').toLowerCase().includes(q) ||
            (m.model||'').toLowerCase().includes(q) ||
            (m.sn||'').toLowerCase().includes(q) ||
            (m.fleet_no||'').toLowerCase().includes(q) ||
            (m.location||'').toLowerCase().includes(q)
        ) : window._cpAllMachines;
        window.cpRenderByCustomer(data);
    };

    window.cpRenderByCustomer = function(machines) {
        const body = document.getElementById('cp-body');
        if(!body) return;

        if(!machines.length) {
            body.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic;">No machines match your search.</div>';
            return;
        }

        // Group by customer
        const groups = {};
        machines.forEach(m => {
            const cust = m.customer || 'Unassigned';
            if(!groups[cust]) groups[cust] = [];
            groups[cust].push(m);
        });

        const sortedCustomers = Object.keys(groups).sort();

        body.innerHTML = sortedCustomers.map(cust => {
            const ms = groups[cust];
            const warrantyCount = ms.filter(m => m.warranty_status === 'Under Warranty').length;
            const rows = ms.map(m => {
                const modelParts = (m.model || '').split('-');
                const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || '—');
                const hmr = m.current_hmr || 0;
                const hrsLeft = m.hours_remaining_to_service;
                let svcColor = '#10b981';
                if(hrsLeft !== null && hrsLeft !== undefined && (m.next_service_hmr||0) > 0) {
                    if(hrsLeft <= 50) svcColor = '#ef4444';
                    else if(hrsLeft <= 250) svcColor = '#d97706';
                }
                const snKey = (m.sn||'').replace(/[^a-zA-Z0-9]/g,'_');
                const ptId  = `ptb-${snKey||Date.now()}`;
                return `<div style="display:grid; grid-template-columns:1.4fr 1fr 1fr 90px 110px 100px 110px; gap:8px; padding:10px 14px; border-bottom:1px solid #f1f5f9; align-items:center; font-size:13px;">
                    <div style="font-weight:700; color:#0f172a;">${modelCode} <span style="font-size:11px; color:#94a3b8; font-weight:400;">${m.oem||''}</span></div>
                    <div style="font-family:monospace; color:#475569; font-size:12px;">${m.sn||m.name}</div>
                    <div style="color:#64748b;">${m.fleet_no||m.mxg_fleet_no||'—'}</div>
                    <div style="font-weight:700; color:#0f172a; text-align:right;">${hmr.toLocaleString()} hrs</div>
                    <div style="text-align:center;">${(m.next_service_hmr||0) > 0 && hrsLeft !== null && hrsLeft !== undefined ? `<span style="color:${svcColor};font-size:12px;font-weight:700;">${hrsLeft <= 0 ? 'OVERDUE' : hrsLeft+'h left'}</span>` : '<span style="color:#94a3b8;font-size:11px;">—</span>'}</div>
                    <div style="text-align:center;"><span style="background:${m.warranty_status==='Under Warranty'?'#d1fae5':'#f1f5f9'};color:${m.warranty_status==='Under Warranty'?'#047857':'#64748b'};font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;">${m.warranty_status==='Under Warranty'?'In Warranty':'Out'}</span></div>
                    <div id="${ptId}" data-sn="${(m.sn||'').replace(/"/g,'&quot;')}" data-fleet="${(m.fleet_no||m.mxg_fleet_no||'').replace(/"/g,'&quot;')}" style="text-align:center;"><span style="font-size:10px;color:#cbd5e1;">...</span></div>
                </div>`;
            }).join('');

            const custSafe = cust.replace(/'/g,"\\'").replace(/"/g,'&quot;');
            return `<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; margin-bottom:20px;">
                <div onclick="window.openCustomerFleet('${cust.replace(/'/g,"\\'")}')"
                     style="padding:14px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.15s;"
                     onmouseover="this.style.background='#e9f0ff'" onmouseout="this.style.background='#f8fafc'">
                    <div style="font-size:15px; font-weight:800; color:#0f172a;">${cust} <i class="fas fa-chevron-right" style="font-size:11px; color:#94a3b8; margin-left:6px;"></i></div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:12px; font-weight:700; color:#1d4ed8;">${ms.length} machine${ms.length!==1?'s':''}</span>
                        ${warrantyCount > 0 ? `<span style="font-size:12px; font-weight:700; color:#047857;">· ${warrantyCount} in warranty</span>` : ''}
                        <button onclick="event.stopPropagation(); window.openPtLinkPanel('${custSafe}');"
                            style="background:#1e293b; color:#94a3b8; border:1px solid #334155; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.18s;"
                            onmouseover="this.style.background='#334155';this.style.color='#e2e8f0';" onmouseout="this.style.background='#1e293b';this.style.color='#94a3b8';">
                            <i class="fas fa-satellite-dish" style="font-size:10px;"></i> Powertrack
                        </button>
                        <button onclick="event.stopPropagation(); window.openCustomerProfile('${cust.replace(/'/g,"\\'")}');"
                            style="background:linear-gradient(135deg,#8b2219,#5a1512); color:white; border:none; padding:6px 14px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; letter-spacing:0.01em; box-shadow:0 2px 8px rgba(139,34,25,0.25); transition:box-shadow 0.18s;"
                            onmouseover="this.style.boxShadow='0 4px 14px rgba(139,34,25,0.45)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(139,34,25,0.25)'">
                            <i class="fas fa-user-circle"></i> Profile
                        </button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1.4fr 1fr 1fr 90px 110px 100px 110px; gap:8px; padding:8px 14px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Model</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Serial No.</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Fleet No.</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:right;">HMR</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:center;">Service</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:center;">Warranty</div>
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; text-align:center; display:flex; align-items:center; justify-content:center; gap:4px;"><i class="fas fa-satellite-dish" style="font-size:9px;"></i> PT</div>
                </div>
                ${rows}
            </div>`;
        }).join('');

        // ── Fire PT badge updates in background (non-blocking) ──────
        const uniqueCustomers = Object.keys(groups);
        setTimeout(() => window.loadCustomerPtData(uniqueCustomers), 200);
    };

    // ============================================================
    // CUSTOMER FLEET DETAIL PANEL
    // ============================================================
    window.openCustomerFleet = function(customerName) {
        const machines = window._cpAllMachines.filter(m => (m.customer || 'Unassigned') === customerName);
        const panel = document.getElementById('cf-panel');
        const backdrop = document.getElementById('cf-panel-backdrop');
        if(!panel) return;

        document.getElementById('cf-panel-name').innerText = customerName;
        document.getElementById('cf-panel-sub').innerText = `${machines.length} machine${machines.length!==1?'s':''} on Fleetrack`;

        const warrantyCount = machines.filter(m => m.warranty_status === 'Under Warranty').length;
        const serviceDue = machines.filter(m => (m.hours_remaining_to_service||0) <= 250 && (m.next_service_hmr||0) > 0).length;
        const overdue = machines.filter(m => (m.hours_remaining_to_service||0) <= 0 && (m.next_service_hmr||0) > 0).length;
        const avgHmr = machines.length ? Math.round(machines.reduce((s,m) => s + (m.current_hmr||0), 0) / machines.length) : 0;

        document.getElementById('cf-panel-stats').innerHTML = [
            `<div style="text-align:center;"><div style="font-size:22px;font-weight:800;color:white;">${machines.length}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Machines</div></div>`,
            `<div style="text-align:center;"><div style="font-size:22px;font-weight:800;color:${warrantyCount>0?'#34d399':'#64748b'};">${warrantyCount}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">In Warranty</div></div>`,
            `<div style="text-align:center;"><div style="font-size:22px;font-weight:800;color:${overdue>0?'#f87171':serviceDue>0?'#fbbf24':'#64748b'};">${serviceDue}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Service Due</div></div>`,
            overdue > 0 ? `<div style="text-align:center;"><div style="font-size:22px;font-weight:800;color:#f87171;">${overdue}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Overdue</div></div>` : '',
            `<div style="text-align:center;"><div style="font-size:22px;font-weight:800;color:#e2e8f0;">${avgHmr.toLocaleString()}</div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Avg HMR</div></div>`
        ].join('');

        const body = document.getElementById('cf-panel-body');
        if(!machines.length) {
            body.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">No machines found.</div>';
        } else {
            body.innerHTML = machines.map(m => {
                const modelParts = (m.model||'').split('-');
                const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||'Unknown Model');
                const hmr = m.current_hmr || 0;
                const hrsLeft = m.hours_remaining_to_service;
                const hasService = (m.next_service_hmr||0) > 0;
                let svcColor = '#10b981'; let svcBg = '#d1fae5';
                if(hasService && hrsLeft !== null && hrsLeft !== undefined) {
                    if(hrsLeft <= 0)   { svcColor = '#ef4444'; svcBg = '#fee2e2'; }
                    else if(hrsLeft <= 50)  { svcColor = '#ef4444'; svcBg = '#fee2e2'; }
                    else if(hrsLeft <= 150) { svcColor = '#f59e0b'; svcBg = '#fef3c7'; }
                    else if(hrsLeft <= 250) { svcColor = '#d97706'; svcBg = '#fef3c7'; }
                }
                const isWarranty = m.warranty_status === 'Under Warranty';
                const isOverdue = hasService && hrsLeft !== null && hrsLeft <= 0;

                const row = (label, value) =>
                    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;gap:12px;">
                        <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;flex-shrink:0;">${label}</span>
                        <span style="font-size:13px;color:#0f172a;text-align:right;">${value}</span>
                    </div>`;

                const details = [];
                if(m.sn)                   details.push(row('Serial No.',      `<span style="font-family:monospace;font-size:12px;">${m.sn}</span>`));
                if(m.fleet_no||m.mxg_fleet_no) details.push(row('Fleet No.',  `<span style="font-family:monospace;">${m.fleet_no||m.mxg_fleet_no}</span>`));
                if(m.region)               details.push(row('Region',          m.region));
                if(m.location)             details.push(row('Location',        `<span style="font-weight:600;">${m.location}</span>`));
                if(m.type)                 details.push(row('Machine Type',    m.type));
                if(m.engine_type)          details.push(row('Engine Type',     m.engine_type));
                if(m.chassis_number)       details.push(row('Chassis No.',     `<span style="font-family:monospace;font-size:12px;">${m.chassis_number}</span>`));
                if(m.esn)                  details.push(row('Engine Serial',   `<span style="font-family:monospace;font-size:12px;">${m.esn}</span>`));
                if(m.has_telematics_device) details.push(row('Telematics',    '<span style="color:#047857;font-weight:700;">\u2713 Fitted</span>'));
                details.push(row('Current HMR', `<span style="font-weight:800;font-size:14px;">${hmr.toLocaleString()} hrs</span>`));
                if(m.service_interval_hours) details.push(row('Service Interval', `${m.service_interval_hours} hrs`));
                if(m.last_service_hmr)     details.push(row('Last Service HMR',   `${Number(m.last_service_hmr).toLocaleString()} hrs`));
                if(m.last_service_date)    details.push(row('Last Service Date',  m.last_service_date));
                if(m.last_service_type)    details.push(row('Last Service Type',  m.last_service_type));
                if(m.next_service_hmr)     details.push(row('Next Service HMR',   `<span style="font-weight:700;color:${svcColor};">${Number(m.next_service_hmr).toLocaleString()} hrs</span>`));
                if(m.next_service_type)    details.push(row('Next Service Type',  m.next_service_type));
                if(hasService && hrsLeft !== null && hrsLeft !== undefined)
                    details.push(row('Hours to Service', `<span style="font-weight:800;color:${svcColor};">${hrsLeft <= 0 ? 'OVERDUE' : hrsLeft + ' hrs'}</span>`));
                if(m.service_obligation)   details.push(row('Service Obligation', m.service_obligation));
                if(m.warranty_type)        details.push(row('Warranty Type',      m.warranty_type));
                if(m.fleetrack_managed)    details.push(row('Fleetrack Managed',  '<span style="color:#047857;font-weight:700;">Yes</span>'));

                const borderColor = isOverdue ? '#fecaca' : isWarranty ? '#bbf7d0' : '#e2e8f0';
                const headerBg = isOverdue ? '#fff1f2' : isWarranty ? '#f0fdf4' : '#f8fafc';

                return `<div style="background:white;border:1px solid ${borderColor};border-radius:16px;overflow:hidden;margin-bottom:18px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                    <div style="padding:14px 18px;background:${headerBg};border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <div style="font-size:17px;font-weight:800;color:#0f172a;">${modelCode} <span style="font-size:12px;font-weight:500;color:#64748b;">${m.oem||''}</span></div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:3px;font-family:monospace;">${m.name}</div>
                        </div>
                        <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-left:12px;">
                            <span style="background:${isWarranty?'#d1fae5':'#f1f5f9'};color:${isWarranty?'#047857':'#64748b'};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;">${isWarranty?'In Warranty':'Out of Warranty'}</span>
                            ${hasService && hrsLeft !== null && hrsLeft !== undefined ? `<span style="background:${svcBg};color:${svcColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;">${hrsLeft<=0?'SERVICE OVERDUE':hrsLeft+'h to service'}</span>` : ''}
                        </div>
                    </div>
                    <div style="padding:4px 18px 10px;">${details.join('')}</div>
                </div>`;
            }).join('');
        }

        panel.style.display = 'flex';
        backdrop.style.display = 'block';
    };

    window.closeCustomerFleetPanel = function() {
        const p = document.getElementById('cf-panel');
        const b = document.getElementById('cf-panel-backdrop');
        if(p) p.style.display = 'none';
        if(b) b.style.display = 'none';
    };

    // ══════════════════════════════════════════════════════════════════
    // CUSTOMER PROFILE PANEL
    // ══════════════════════════════════════════════════════════════════

    // Fuzzy match: normalise a string to lowercase tokens, strip punctuation
    function _cppTokens(str) {
        return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    }
    function _cppFuzzyMatch(a, b) {
        if (!a || !b) return false;
        const ta = _cppTokens(a), tb = _cppTokens(b);
        if (!ta.length || !tb.length) return false;
        // Match if all tokens of the shorter string appear in the longer string
        const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
        return shorter.every(t => longer.some(l => l.startsWith(t) || t.startsWith(l)));
    }

    window.openCustomerProfile = async function(customerName) {
        const panel   = document.getElementById('cp-profile-panel');
        const backdrop = document.getElementById('cp-profile-backdrop');
        if (!panel) return;

        // Reset UI
        document.getElementById('cpp-name').innerText = customerName;
        document.getElementById('cpp-sub').innerText  = 'Loading…';
        document.getElementById('cpp-stats').innerHTML = '';
        document.getElementById('cpp-body-fleet').innerHTML   = '<div class="cpp-empty"><i class="fas fa-spinner fa-spin" style="font-size:22px;"></i><br><br>Loading fleet…</div>';
        document.getElementById('cpp-body-defects').innerHTML = '<div class="cpp-empty"><i class="fas fa-spinner fa-spin" style="font-size:22px;"></i><br><br>Loading defects…</div>';
        document.getElementById('cpp-body-quotes').innerHTML  = '<div class="cpp-empty"><i class="fas fa-spinner fa-spin" style="font-size:22px;"></i><br><br>Loading quotes…</div>';
        window.cpProfileTab('fleet');

        panel.style.display   = 'flex';
        backdrop.style.display = 'block';

        // --- Fleet data (already loaded) ---
        const machines = (window._cpAllMachines || []).filter(m =>
            (m.customer || 'Unassigned') === customerName
        );
        const warrantyCount = machines.filter(m => m.warranty_status === 'Under Warranty').length;
        const serviceDue    = machines.filter(m => (m.hours_remaining_to_service||0) <= 250 && (m.next_service_hmr||0) > 0).length;
        const overdue       = machines.filter(m => (m.hours_remaining_to_service||0) <= 0  && (m.next_service_hmr||0) > 0).length;

        document.getElementById('cpp-sub').innerText = `${machines.length} machine${machines.length!==1?'s':''} · Fleetrack`;

        // Render fleet tab immediately
        window.cpRenderProfileFleet(machines);

        // --- Defects (async from Fleetrack cache or fresh fetch) ---
        window.cpRenderProfileDefects(customerName, machines.length).catch(console.error);

        // --- Quotes (async from Salestrack) ---
        window.cpRenderProfileQuotes(customerName).then(qCount => {
            // Update stats bar once all data is ready
            document.getElementById('cpp-stats').innerHTML = [
                `<div class="cpp-stat"><div class="cpp-stat-val">${machines.length}</div><div class="cpp-stat-lbl">Machines</div></div>`,
                `<div class="cpp-stat"><div class="cpp-stat-val" style="color:${warrantyCount>0?'#34d399':'#64748b'};">${warrantyCount}</div><div class="cpp-stat-lbl">In Warranty</div></div>`,
                `<div class="cpp-stat"><div class="cpp-stat-val" style="color:${overdue>0?'#f87171':serviceDue>0?'#fbbf24':'#64748b'};">${serviceDue}</div><div class="cpp-stat-lbl">Service Due</div></div>`,
                overdue > 0 ? `<div class="cpp-stat"><div class="cpp-stat-val" style="color:#f87171;">${overdue}</div><div class="cpp-stat-lbl">Overdue</div></div>` : '',
                `<div class="cpp-stat"><div class="cpp-stat-val" style="color:#e2e8f0;">${qCount}</div><div class="cpp-stat-lbl">Quotes</div></div>`,
            ].join('');
        }).catch(console.error);
    };

    window.closeCustomerProfile = function() {
        const p = document.getElementById('cp-profile-panel');
        const b = document.getElementById('cp-profile-backdrop');
        if (p) p.style.display = 'none';
        if (b) b.style.display = 'none';
    };

    window.cpProfileTab = function(tab) {
        ['fleet','defects','quotes'].forEach(t => {
            document.getElementById('cpp-body-' + t).style.display = t === tab ? 'flex' : 'none';
            document.getElementById('cpp-tab-' + t).classList.toggle('active', t === tab);
        });
        // flex needs column direction for tab bodies
        const active = document.getElementById('cpp-body-' + tab);
        if (active) { active.style.flexDirection = 'column'; }
    };

    // ─── Fleet Tab ──────────────────────────────────────────────────
    window.cpRenderProfileFleet = function(machines) {
        const el = document.getElementById('cpp-body-fleet');
        if (!el) return;
        if (!machines.length) {
            el.innerHTML = '<div class="cpp-empty"><i class="fas fa-tractor" style="font-size:28px; margin-bottom:12px;"></i><br>No machines found in Fleetrack for this customer.</div>';
            return;
        }

        const fld = (label, value) => `
            <div class="cpp-field-row">
                <span class="cpp-field-lbl">${label}</span>
                <span class="cpp-field-val">${value}</span>
            </div>`;

        el.innerHTML = machines.map(m => {
            const modelParts = (m.model || '').split('-');
            const modelCode  = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || 'Unknown');
            const hmr        = m.current_hmr || 0;
            const hrsLeft    = m.hours_remaining_to_service;
            const hasService = (m.next_service_hmr || 0) > 0;
            const isWarranty = m.warranty_status === 'Under Warranty';
            const isOverdue  = hasService && hrsLeft !== null && hrsLeft <= 0;
            let svcColor = '#10b981';
            if (hasService && hrsLeft !== null) {
                if (hrsLeft <= 0)   svcColor = '#ef4444';
                else if (hrsLeft <= 50)  svcColor = '#ef4444';
                else if (hrsLeft <= 250) svcColor = '#d97706';
            }
            const borderColor = isOverdue ? '#fecaca' : isWarranty ? '#bbf7d0' : '#e2e8f0';
            const wBadge = `<span class="cpp-badge ${isWarranty?'cpp-badge-warranty':'cpp-badge-out'}">${isWarranty?'In Warranty':'Out of Warranty'}</span>`;
            const sBadge = hasService && hrsLeft !== null
                ? `<span class="cpp-badge" style="background:${isOverdue?'#fee2e2':'#fef3c7'};color:${svcColor};">${hrsLeft<=0?'OVERDUE':hrsLeft+'h to service'}</span>`
                : '';

            const rows = [];
            if (m.sn)                    rows.push(fld('Serial No.', `<span style="font-family:monospace;font-size:12px;">${m.sn}</span>`));
            if (m.fleet_no||m.mxg_fleet_no) rows.push(fld('Fleet No.', `<span style="font-family:monospace;">${m.fleet_no||m.mxg_fleet_no}</span>`));
            if (m.region)                rows.push(fld('Region',   m.region));
            if (m.location)              rows.push(fld('Location', `<strong>${m.location}</strong>`));
            rows.push(fld('Current HMR', `<strong>${hmr.toLocaleString()} hrs</strong>`));
            if (hasService && hrsLeft !== null)
                rows.push(fld('Hours to Service', `<span style="font-weight:800;color:${svcColor};">${hrsLeft<=0?'OVERDUE':hrsLeft+' hrs'}</span>`));
            if (m.last_service_date)  rows.push(fld('Last Service', m.last_service_date));
            if (m.next_service_hmr)   rows.push(fld('Next Service HMR', `<span style="color:${svcColor};font-weight:700;">${Number(m.next_service_hmr).toLocaleString()} hrs</span>`));

            return `<div class="cpp-machine-card" style="border-color:${borderColor};">
                <div class="cpp-machine-header">
                    <div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;">${modelCode} <span style="font-size:12px;font-weight:500;color:#64748b;">${m.oem||''}</span></div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">${m.name}</div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">${wBadge}${sBadge}</div>
                </div>
                <div class="cpp-machine-body">${rows.join('')}</div>
            </div>`;
        }).join('');
    };

    // ─── Defects Tab ─────────────────────────────────────────────────
    window.cpRenderProfileDefects = async function(customerName, machineCount) {
        const el = document.getElementById('cpp-body-defects');
        if (!el) return;

        try {
            // Use cached defect data if available, otherwise fetch
            let allDefects = window._cppAllDefects;
            if (!allDefects) {
                const ftBaseUrl = 'https://fleetrack.machinery-exchange.com';
                const res = await window.callFrappeSequenced(ftBaseUrl,
                    'mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary', {});
                allDefects = (res?.message?.rows) || [];
                window._cppAllDefects = allDefects;
            }

            // Fuzzy-match this customer's defects
            const matched = allDefects.filter(d => _cppFuzzyMatch(d.customer, customerName));
            const active  = matched.filter(d => !d.end_date);
            const resolved = matched.filter(d => !!d.end_date);

            if (!matched.length) {
                el.innerHTML = `<div class="cpp-empty"><i class="fas fa-check-circle" style="font-size:28px;color:#10b981;margin-bottom:12px;"></i><br>No defects found for this customer.</div>`;
                // Update defects tab badge
                document.getElementById('cpp-tab-defects').innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Defects`;
                return;
            }

            // Update tab label with count
            document.getElementById('cpp-tab-defects').innerHTML =
                `<i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Defects <span style="background:#fee2e2;color:#b91c1c;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:4px;">${active.length}</span>`;

            const renderDefect = (d) => {
                const pri = d.priority || 'Low';
                const priClass = pri === 'High' || pri === 'Critical' ? 'high' : pri === 'Medium' ? 'medium' : 'low';
                let priColor = '#64748b', priBg = '#f1f5f9';
                if (pri === 'High' || pri === 'Critical') { priColor = '#ef4444'; priBg = '#fee2e2'; }
                else if (pri === 'Medium') { priColor = '#d97706'; priBg = '#fef3c7'; }
                const daysNum = d.defect_days || 0;
                let daysColor = '#64748b';
                if (daysNum > 30) daysColor = '#b91c1c';
                else if (daysNum > 14) daysColor = '#d97706';
                else if (daysNum > 7) daysColor = '#f59e0b';
                const defectLabel = (d.name || '').replace(/-[a-f0-9]{3}$/, '');
                const modelParts = (d.model || '').split('-');
                const modelCode  = modelParts.length > 1 ? modelParts.slice(1).join('-') : (d.model || '—');
                const statusColor = d.end_date ? '#10b981' : '#3b82f6';
                const statusBg    = d.end_date ? '#d1fae5' : '#dbeafe';

                return `<div class="cpp-defect-card ${priClass}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.4;margin-bottom:6px;">${defectLabel}</div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                <span style="font-size:12px;font-weight:700;color:#334155;">${modelCode}</span>
                                ${d.oem ? `<span style="font-size:11px;color:#94a3b8;">· ${d.oem}</span>` : ''}
                                ${d.location ? `<span style="font-size:11px;color:#64748b;"><i class="fas fa-map-marker-alt" style="margin-right:3px;"></i>${d.location}</span>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;">
                            <span class="cpp-badge" style="background:${priBg};color:${priColor};">${pri}</span>
                            <span class="cpp-badge" style="background:${statusBg};color:${statusColor};">${d.status || 'Open'}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#64748b;">
                        <span><i class="fas fa-calendar-alt" style="margin-right:3px;"></i>${d.start_date || '—'}</span>
                        <span style="color:${daysColor};font-weight:700;"><i class="fas fa-clock" style="margin-right:3px;"></i>${daysNum}d open</span>
                        ${d.machine ? `<span style="font-family:monospace;">${d.machine}</span>` : ''}
                    </div>
                </div>`;
            };

            let html = '';
            if (active.length) {
                html += `<div class="cpp-section-label"><i class="fas fa-fire" style="color:#ef4444;"></i>Active Defects (${active.length})</div>`;
                html += active.map(renderDefect).join('');
            }
            if (resolved.length) {
                html += `<div class="cpp-section-label" style="margin-top:${active.length?'24px':'0'};"><i class="fas fa-check-circle" style="color:#10b981;"></i>Resolved (${resolved.length})</div>`;
                html += resolved.map(renderDefect).join('');
            }
            el.innerHTML = html;

        } catch (e) {
            console.error('cpRenderProfileDefects error:', e);
            el.innerHTML = '<div class="cpp-empty" style="color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:22px;margin-bottom:10px;"></i><br>Failed to load defects.</div>';
        }
    };

    // ─── Quotes Tab ──────────────────────────────────────────────────
    window.cpRenderProfileQuotes = async function(customerName) {
        const el = document.getElementById('cpp-body-quotes');
        if (!el) return 0;

        try {
            const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, '');
            const res  = await window.callFrappeSequenced(base,
                'powerstar_salestrack.omnis_dashboard.get_customer_quotes',
                { customer_name: customerName });

            const quotes = res?.message?.data || res?.data || [];

            if (!quotes.length) {
                el.innerHTML = `<div class="cpp-empty"><i class="fas fa-file-invoice-dollar" style="font-size:28px;margin-bottom:12px;"></i><br>No quotations found for this customer.</div>`;
                return 0;
            }

            // Update tab label with count
            document.getElementById('cpp-tab-quotes').innerHTML =
                `<i class="fas fa-file-invoice-dollar" style="margin-right:6px;"></i>Quotes <span style="background:#dbeafe;color:#1d4ed8;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:4px;">${quotes.length}</span>`;

            const statusBadge = (status) => {
                const s = (status || '').toLowerCase();
                if (s === 'ordered')  return `<span class="cpp-badge cpp-badge-ordered">Ordered</span>`;
                if (s === 'lost')     return `<span class="cpp-badge cpp-badge-lost">Lost</span>`;
                if (s === 'expired')  return `<span class="cpp-badge cpp-badge-expired">Expired</span>`;
                return `<span class="cpp-badge cpp-badge-open">${status || 'Open'}</span>`;
            };

            el.innerHTML = quotes.map(q => {
                const items = q.items || [];
                const itemRows = items.length
                    ? items.map(i => `
                        <div class="cpp-item-row">
                            <span class="cpp-item-qty">${i.qty || 1}×</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;color:#0f172a;font-size:13px;">${i.item_name || i.item_code || '—'}</div>
                                ${i.brand ? `<div style="font-size:11px;color:#64748b;">${i.brand}${i.item_group ? ' · ' + i.item_group : ''}</div>` : ''}
                            </div>
                        </div>`).join('')
                    : `<div style="font-size:12px;color:#94a3b8;font-style:italic;padding:8px 0;">No line items found.</div>`;

                const salesPerson = q.custom_sales_person || q.salesperson || '';
                return `<div class="cpp-quote-card">
                    <div class="cpp-quote-header">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:800;color:#0f172a;">${q.title || q.name}</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">${q.name} · ${q.transaction_date || '—'}${salesPerson ? ' · ' + salesPerson : ''}</div>
                        </div>
                        <div style="flex-shrink:0;margin-left:12px;">${statusBadge(q.status)}</div>
                    </div>
                    <div class="cpp-quote-items">${itemRows}</div>
                </div>`;
            }).join('');

            return quotes.length;
        } catch (e) {
            console.error('cpRenderProfileQuotes error:', e);
            el.innerHTML = '<div class="cpp-empty" style="color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:22px;margin-bottom:10px;"></i><br>Failed to load quotes.</div>';
            return 0;
        }
    };

    // ═══════════════════════════════════════════════════════
    //  OEM PROCUREMENT INTELLIGENCE TABLE
    // ═══════════════════════════════════════════════════════
    window._renderOEMProcurementTable = function(container, data, activePeriod) {
        if (!container) return;

        const oemId = (s) => s.replace(/[^a-z0-9]/gi, '_');

        // ── Signal badge ─────────────────────────────────────
        const signal = (model) => {
            const v = model.monthly_velocity || 0;
            const q = model.quotes || 0;
            if (v >= 1.5 && q >= 5)   return { label: 'ORDER',  col: '#059669', bg: '#d1fae5' };
            if (v >= 0.5  || q >= 3)  return { label: 'WATCH',  col: '#d97706', bg: '#fef3c7' };
            return                            { label: 'HOLD',   col: '#94a3b8', bg: '#f1f5f9' };
        };

        // ── Movement dots ─────────────────────────────────────
        const dots = (score) => {
            const filled  = '#8b2219';
            const empty   = '#e2e8f0';
            return Array.from({length:5}, (_,i) =>
                `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${i < score ? filled : empty};margin-right:2px;"></span>`
            ).join('');
        };

        // ── Build brand row HTML ──────────────────────────────
        const buildBrandRow = (d) => {
            const sales     = d.sales || d.total_qty || 0;
            const quotes    = d.quotes || 0;
            const convRate  = quotes > 0 ? ((sales / quotes) * 100).toFixed(1) : '—';
            const velocity  = d.monthly_velocity || 0;
            const suggest   = d.suggested_order || 0;
            const models    = d.models || [];
            const id        = oemId(d.oem);

            const brandRow = `
            <tr class="oem-brand-row" data-oem-id="${id}" data-signal="${models.some(m=>signal(m).label==='ORDER')?'order':models.some(m=>signal(m).label==='WATCH')?'watch':'hold'}" data-moving="${velocity>0?'1':'0'}"
                style="border-bottom:1px solid #e2e8f0; cursor:pointer; transition:background 0.15s; background:#fff;">
                <td style="padding:14px 16px; font-weight:800; color:#0f172a;">
                    <div style="display:flex; align-items:center; gap:10px; white-space:nowrap; width:100%;">
                    <span id="oem-chevron-${id}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:#f1f5f9;color:#64748b;font-size:10px;transition:transform 0.2s;flex-shrink:0;">
                        <i class="fas fa-chevron-right"></i>
                    </span>
                    ${d.oem}
                    ${models.length > 0 ? `<span style="background:#e0e7ff;color:#4338ca;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;flex-shrink:0;">${models.length} model${models.length!==1?'s':''}</span>` : ''}
                    <button onclick="event.stopPropagation(); window.salestrack.openOEMBreakdownModal('${d.oem.replace(/'/g, "\\'")}', null, null, null, {ytdSales:${sales},ytdQuotes:${quotes}})" title="Presentation Mode" style="background:#f1f5f9; border:1px solid #e2e8f0; color:#3b82f6; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; margin-left:auto; transition:all 0.2s;" onmouseover="this.style.background='#e0f2fe';this.style.borderColor='#bae6fd';" onmouseout="this.style.background='#f1f5f9';this.style.borderColor='#e2e8f0';">
                        <i class="fas fa-desktop" style="margin-right:4px;"></i> Present
                    </button>
                    </div>
                </td>
                <td style="padding:14px 16px; font-weight:700; color:#0f172a; text-align:center;">${sales}</td>
                <td style="padding:14px 16px; font-weight:700; color:#475569; text-align:center;">${velocity} <span style="font-size:10px;opacity:0.6;">u/mo</span></td>
                <td style="padding:14px 16px; font-weight:700; color:#0f172a; text-align:center;">${quotes}</td>
                <td style="padding:14px 16px; text-align:center;">
                    ${convRate !== '—' ? `<span style="background:#f0f9ff;color:#0369a1;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:800;">${convRate}%</span>` : '<span style="color:#94a3b8;font-size:12px;">—</span>'}
                </td>
                <td style="padding:14px 16px; text-align:center;" colspan="2">
                    <span style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:900;box-shadow:0 2px 4px rgba(5,150,105,0.2);">${suggest} <span style="font-size:10px;opacity:0.85;">Units</span></span>
                </td>
            </tr>`;

            // Model sub-rows
            const modelRows = models.map(m => {
                const sig = signal(m);
                const mv  = m.monthly_velocity || 0;
                const mq  = m.quotes || 0;
                const mc  = mq > 0 ? ((m.sales / mq) * 100).toFixed(0) : '—';
                return `
            <tr class="oem-model-row oem-model-row-${id}" style="display:none; border-bottom:1px solid #f1f5f9; background:#fafbfc;"
                data-signal="${sig.label.toLowerCase()}" data-moving="${mv>0?'1':'0'}">
                <td style="padding:10px 16px 10px 48px; color:#334155;">
                    <div style="font-weight:700; font-size:12.5px; color:#1e293b;">${m.model}</div>
                </td>
                <td style="padding:10px 16px; text-align:center; font-weight:700; font-size:13px; color:#0f172a;">${m.sales}</td>
                <td style="padding:10px 16px; text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
                        <span style="font-weight:700;font-size:12px;color:#475569;">${mv}</span>
                        <span style="font-size:9px;color:#94a3b8;">u/mo</span>
                        <span>${dots(m.movement_score || 0)}</span>
                    </div>
                </td>
                <td style="padding:10px 16px; text-align:center; font-weight:600; font-size:12px; color:#334155;">${mq}</td>
                <td style="padding:10px 16px; text-align:center; font-size:12px; color:#64748b;">${mc !== '—' ? mc + '%' : '—'}</td>
                <td style="padding:10px 16px; text-align:center;">
                    <span style="background:${sig.bg};color:${sig.col};font-size:10px;font-weight:800;padding:3px 9px;border-radius:12px;letter-spacing:0.03em;">${sig.label}</span>
                </td>
                <td style="padding:10px 16px; text-align:center;">
                    ${m.suggested_order > 0
                        ? `<span style="background:#fff;border:1.5px solid ${sig.col};color:${sig.col};font-size:12px;font-weight:800;padding:3px 10px;border-radius:6px;">${m.suggested_order} u</span>`
                        : '<span style="color:#94a3b8;font-size:12px;">—</span>'}
                </td>
            </tr>`;
            }).join('');

            return brandRow + modelRows;
        };

        // ── Full render ───────────────────────────────────────
        const attachRowHandlers = () => {
            document.querySelectorAll('tr.oem-brand-row').forEach(tr => {
                // Remove any prior listener by cloning (avoids double-fire)
                const fresh = tr.cloneNode(true);
                tr.parentNode && tr.parentNode.replaceChild(fresh, tr);
                fresh.addEventListener('click', () => {
                    const id = fresh.dataset.oemId;
                    if (id) window._oemToggleBrand(id, fresh);
                });
                fresh.addEventListener('mouseover', () => {
                    if (!fresh.classList.contains('oem-expanded')) fresh.style.background = '#f8fafc';
                });
                fresh.addEventListener('mouseout', () => {
                    if (!fresh.classList.contains('oem-expanded')) fresh.style.background = '#fff';
                });
            });
        };

        const render = (rawData, signalFilter, searchTerm) => {
            // --- INTERCEPT & REASSIGN "SPECIAL BUILD" ---
            if (Array.isArray(rawData)) {
                const specialIndex = rawData.findIndex(d => (d.oem || "").toLowerCase().includes("special build"));
                if (specialIndex > -1) {
                    const specialD = rawData[specialIndex];
                    const specialModels = specialD.models || [];
                    const keptModels = [];
                    
                    specialModels.forEach(m => {
                        const searchStr = `${m.model || ''} ${m.item_name || ''} ${m.item_code || ''}`.toLowerCase();
                        let target = null;
                        if (searchStr.includes("foton")) target = "Foton";
                        else if (searchStr.includes("powerstar")) target = "Powerstar";
                        else if (searchStr.includes("sino")) target = "Sino";
                        
                        if (target) {
                            let tOem = rawData.find(d => (d.oem || "").toLowerCase() === target.toLowerCase());
                            if (!tOem) {
                                tOem = { oem: target, models: [], sales: 0, total_qty: 0, quotes: 0, monthly_velocity: 0, suggested_order: 0 };
                                rawData.push(tOem);
                            }
                            if (!tOem.models) tOem.models = [];
                            if (!tOem.models.includes(m)) tOem.models.push(m);
                        } else {
                            keptModels.push(m);
                        }
                    });
                    
                    specialD.models = keptModels;
                    
                    rawData.forEach(d => {
                        if (d.models && d.models.length > 0) {
                            d.sales = d.models.reduce((sum, m) => sum + (m.sales || m.total_qty || 0), 0);
                            d.total_qty = d.sales;
                            d.quotes = d.models.reduce((sum, m) => sum + (m.quotes || 0), 0);
                            d.monthly_velocity = parseFloat(d.models.reduce((sum, m) => sum + (m.monthly_velocity || 0), 0).toFixed(1));
                            d.suggested_order = d.models.reduce((sum, m) => sum + (m.suggested_order || 0), 0);
                        }
                    });
                    
                    if (specialD.models.length === 0) {
                        rawData.splice(rawData.indexOf(specialD), 1);
                    }
                }
            }
            // --- INTERCEPT & MERGE POWERSTAR → EVERSTAR INDUSTRIES ---
            if (Array.isArray(rawData)) {
                // Find all Powerstar-named rows (any variant)
                const powerstarRows = rawData.filter(d =>
                    (d.oem || '').toLowerCase().includes('powerstar') ||
                    (d.oem || '').toLowerCase().includes('power star')
                );
                if (powerstarRows.length > 0) {
                    // Find or create the Everstar Industries row
                    let everstarRow = rawData.find(d => (d.oem || '').toLowerCase().includes('everstar'));
                    if (!everstarRow) {
                        everstarRow = { oem: 'Everstar Industries', models: [], sales: 0, total_qty: 0, quotes: 0, monthly_velocity: 0, suggested_order: 0 };
                        rawData.push(everstarRow);
                    }
                    if (!everstarRow.models) everstarRow.models = [];
                    // Absorb all powerstar rows into Everstar Industries
                    powerstarRows.forEach(psRow => {
                        (psRow.models || []).forEach(m => {
                            if (!everstarRow.models.includes(m)) everstarRow.models.push(m);
                        });
                        // Remove the powerstar row from rawData
                        const idx = rawData.indexOf(psRow);
                        if (idx > -1) rawData.splice(idx, 1);
                    });
                    // Recalculate Everstar totals
                    everstarRow.sales = everstarRow.models.reduce((s, m) => s + (m.sales || m.total_qty || 0), 0);
                    everstarRow.total_qty = everstarRow.sales;
                    everstarRow.quotes = everstarRow.models.reduce((s, m) => s + (m.quotes || 0), 0);
                    everstarRow.monthly_velocity = parseFloat(everstarRow.models.reduce((s, m) => s + (m.monthly_velocity || 0), 0).toFixed(1));
                    everstarRow.suggested_order = everstarRow.models.reduce((s, m) => s + (m.suggested_order || 0), 0);
                }
            }
            // ----------------------------------------------------


            let filtered = rawData.filter(d => {
                if (searchTerm) {
                    const q = searchTerm.toLowerCase();
                    const matchBrand  = d.oem.toLowerCase().includes(q);
                    const matchModel  = (d.models||[]).some(m => m.model.toLowerCase().includes(q));
                    if (!matchBrand && !matchModel) return false;
                }
                if (signalFilter === 'moving') return (d.monthly_velocity || 0) > 0;
                if (signalFilter === 'order')  return (d.models||[]).some(m => signal(m).label === 'ORDER');
                return true;
            });

            const rows = filtered.map(d => buildBrandRow(d)).join('');
            const tbody = document.getElementById('oem-proc-tbody');
            if (tbody) {
                tbody.innerHTML = rows || `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;">No brands match filters.</td></tr>`;
                attachRowHandlers(); // bind immediately after DOM is set
            }
        };

        // ── Period fetch ──────────────────────────────────────
        const reloadForPeriod = async (period) => {
            const tbody = document.getElementById('oem-proc-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;"><div style="display:inline-block;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#8b2219;border-radius:50%;animation:spin 0.8s linear infinite;"></div></td></tr>`;

            try {
                const baseUrl = window.salestrack?.sys?.baseUrl || window._SALESTRACK_BASE_URL || '';
                const res = await window.callFrappeSequenced(baseUrl, 'powerstar_salestrack.omnis_dashboard.get_oem_summary', { period });
                const payload = res?.message || res;
                if (payload?.ok && Array.isArray(payload.data)) {
                    window._oemTableData = payload.data;
                    const sf = document.querySelector('.oem-sig-btn.active')?.dataset?.sig || 'all';
                    const st = document.getElementById('oem-proc-search')?.value || '';
                    render(payload.data, sf, st);
                }
            } catch (e) {
                console.error('OEM period reload failed:', e);
                const tbody = document.getElementById('oem-proc-tbody');
                if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#ef4444;">Failed to load data. Check console.</td></tr>`;
            }
        };

        // ── Inject HTML ───────────────────────────────────────
        container.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.04);">

            <!-- Toolbar -->
            <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:12px;align-items:center;background:#fafafa;">
                <!-- Period pills -->
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${['This Month','This Quarter','This Year','Last Year'].map(p =>
                        `<button class="oem-period-btn" data-period="${p}" style="padding:6px 13px;border-radius:20px;border:1.5px solid ${p===activePeriod?'#8b2219':'#e2e8f0'};background:${p===activePeriod?'#8b2219':'#fff'};color:${p===activePeriod?'#fff':'#475569'};font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;">${p}</button>`
                    ).join('')}
                </div>
                <!-- Signal filter -->
                <div style="display:flex;gap:6px;margin-left:auto;">
                    ${[['all','All'],['moving','Moving'],['order','🟢 Order Now']].map(([s,l]) =>
                        `<button class="oem-sig-btn ${s==='all'?'active':''}" data-sig="${s}" style="padding:5px 12px;border-radius:20px;border:1.5px solid ${s==='all'?'#0369a1':'#e2e8f0'};background:${s==='all'?'#eff6ff':'#fff'};color:${s==='all'?'#0369a1':'#64748b'};font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;">${l}</button>`
                    ).join('')}
                </div>
                <!-- Search -->
                <input id="oem-proc-search" placeholder="Search brand or model…" style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:20px;font-size:12px;width:190px;outline:none;transition:border 0.15s;" onfocus="this.style.borderColor='#8b2219'" onblur="this.style.borderColor='#e2e8f0'">
            </div>

            <!-- Table -->
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <th style="padding:13px 16px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;text-align:left;min-width:200px;">Brand / Model</th>
                        <th style="padding:13px 16px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Units Sold</th>
                        <th style="padding:13px 16px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Movement</th>
                        <th style="padding:13px 16px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Pipeline</th>
                        <th style="padding:13px 16px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Conv %</th>
                        <th style="padding:13px 16px;font-weight:800;color:#d97706;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Signal</th>
                        <th style="padding:13px 16px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Order Qty</th>
                    </tr>
                </thead>
                <tbody id="oem-proc-tbody">
                </tbody>
            </table>
            </div>
        </div>
        <style>
            @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
            .oem-model-row { animation: oemSlideIn 0.18s ease; }
            @keyframes oemSlideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        </style>`;

        // Initial render
        render(data, 'all', '');

        // ── Bind events ───────────────────────────────────────
        setTimeout(() => {
            // Period pills
            container.querySelectorAll('.oem-period-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.oem-period-btn').forEach(b => {
                        b.style.background = '#fff'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0';
                    });
                    btn.style.background = '#8b2219'; btn.style.color = '#fff'; btn.style.borderColor = '#8b2219';
                    reloadForPeriod(btn.dataset.period);
                });
            });

            // Signal filter
            container.querySelectorAll('.oem-sig-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.oem-sig-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background='#fff'; b.style.color='#64748b'; b.style.borderColor='#e2e8f0';
                    });
                    btn.classList.add('active');
                    btn.style.background='#eff6ff'; btn.style.color='#0369a1'; btn.style.borderColor='#0369a1';
                    const st = document.getElementById('oem-proc-search')?.value || '';
                    render(window._oemTableData || data, btn.dataset.sig, st);
                });
            });

            // Search
            const searchEl = document.getElementById('oem-proc-search');
            if (searchEl) {
                searchEl.addEventListener('input', () => {
                    const sf = container.querySelector('.oem-sig-btn.active')?.dataset?.sig || 'all';
                    render(window._oemTableData || data, sf, searchEl.value);
                });
            }
            // Row clicks are handled by attachRowHandlers() inside render() — no delegation needed here
        }, 50);
    };

    // Brand row expand toggle
    window._oemToggleBrand = function(id, brandRowEl) {
        const rows    = document.querySelectorAll(`.oem-model-row-${id}`);
        const chevron = document.getElementById(`oem-chevron-${id}`);
        const brandRow = brandRowEl || document.querySelector(`[data-oem-id="${id}"]`);
        // isOpen: true if any model row is currently visible
        const isOpen  = rows.length > 0 && rows[0].style.display !== 'none';
        rows.forEach(r => {
            r.style.display = isOpen ? 'none' : 'table-row';
        });
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
        if (brandRow) {
            brandRow.classList.toggle('oem-expanded', !isOpen);
            brandRow.style.background = isOpen ? '#fff' : '#fffbf0';
        }
    };
    // ════════════════════════════════════════════════════════

    window.rfRenderGrid = function(machines) {
        const grid = document.getElementById('rf-grid');
        if(!grid) return;

        if(!machines.length) {
            grid.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;grid-column:1/-1;font-style:italic;">No machines match your search.</div>';
            return;
        }

        grid.innerHTML = machines.map(m => {
            const modelParts = (m.model || '').split('-');
            const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || 'Unknown Model');
            const hmr = m.current_hmr || 0;
            const nextServiceHmr = m.next_service_hmr || 0;
            const hrsLeft = m.hours_remaining_to_service;
            const isWarranty = m.warranty_status === 'Under Warranty';
            const servicePct = nextServiceHmr > 0 ? Math.min(100, Math.max(0, 100 - (hrsLeft / (m.service_interval_hours || 500)) * 100)) : 0;

            let serviceColor = '#10b981';
            let serviceBg = '#d1fae5';
            if(hrsLeft !== null && hrsLeft !== undefined) {
                if(hrsLeft <= 50) { serviceColor = '#ef4444'; serviceBg = '#fee2e2'; }
                else if(hrsLeft <= 150) { serviceColor = '#f59e0b'; serviceBg = '#fef3c7'; }
                else if(hrsLeft <= 250) { serviceColor = '#d97706'; serviceBg = '#fef3c7'; }
            }

            // Count active defects for this machine
            const machineDefects = window._rdDefectMap ? Object.values(window._rdDefectMap).filter(d => !d.end_date && d.machine === m.name).length : 0;

            return `
            <div onclick="window.rfOpenMachine('${m.name.replace(/'/g, "\\'")}')" style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:22px;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
                <!-- Card Header -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                    <div>
                        <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.3;">${modelCode}</div>
                        <div style="font-size:12px;font-weight:700;color:#1e40af;margin-top:2px;">${m.oem || '-'}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        ${isWarranty ? '<span style="background:#d1fae5;color:#047857;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">Under Warranty</span>' : '<span style="background:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">Out of Warranty</span>'}
                        ${machineDefects > 0 ? `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>${machineDefects} defect${machineDefects>1?'s':''}</span>` : ''}
                    </div>
                </div>

                <!-- Serial + Fleet -->
                <div style="display:flex;gap:12px;margin-bottom:14px;">
                    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:8px 10px;">
                        <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Serial No.</div>
                        <div style="font-size:12px;font-weight:700;color:#0f172a;font-family:monospace;">${m.sn || m.name}</div>
                    </div>
                    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:8px 10px;">
                        <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Fleet No.</div>
                        <div style="font-size:12px;font-weight:700;color:#0f172a;">${m.fleet_no || m.mxg_fleet_no || '—'}</div>
                    </div>
                </div>

                <!-- HMR Display -->
                <div style="margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Hour Meter Reading</span>
                        <span style="font-size:16px;font-weight:800;color:#0f172a;">${hmr.toLocaleString()} hrs</span>
                    </div>
                    <div style="background:#f1f5f9;border-radius:20px;height:6px;overflow:hidden;">
                        <div style="height:100%;width:${servicePct}%;background:linear-gradient(90deg,#10b981,${servicePct > 80 ? '#ef4444' : servicePct > 60 ? '#f59e0b' : '#10b981'});border-radius:20px;transition:width 0.5s;"></div>
                    </div>
                </div>

                <!-- Service Status -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #f1f5f9;">
                    <div style="font-size:12px;color:#64748b;"><i class="fas fa-map-marker-alt" style="margin-right:5px;color:#94a3b8;"></i>${m.location || '—'}</div>
                    ${hrsLeft !== null && hrsLeft !== undefined && nextServiceHmr > 0
                        ? `<span style="background:${serviceBg};color:${serviceColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">${hrsLeft <= 0 ? 'SERVICE OVERDUE' : hrsLeft + ' hrs to service'}</span>`
                        : '<span style="font-size:11px;color:#94a3b8;">No service schedule</span>'}
                </div>
            </div>`;
        }).join('');
    };

    window.rfFilterMachines = function() {
        const q = (document.getElementById('rf-search')?.value || '').toLowerCase().trim();
        if(!q) { window.rfRenderGrid(window._rfAllMachines); return; }
        const filtered = window._rfAllMachines.filter(m =>
            (m.model || '').toLowerCase().includes(q) ||
            (m.sn || '').toLowerCase().includes(q) ||
            (m.name || '').toLowerCase().includes(q) ||
            (m.fleet_no || '').toLowerCase().includes(q) ||
            (m.mxg_fleet_no || '').toLowerCase().includes(q) ||
            (m.oem || '').toLowerCase().includes(q) ||
            (m.location || '').toLowerCase().includes(q)
        );
        window.rfRenderGrid(filtered);
    };

    window.rfOpenMachine = function(machineName) {
        const m = (window._rfAllMachines || []).find(x => x.name === machineName);
        if(!m) return;

        const modelParts = (m.model || '').split('-');
        const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || 'Unknown Model');
        const isWarranty = m.warranty_status === 'Under Warranty';
        const hmr = m.current_hmr || 0;
        const hrsLeft = m.hours_remaining_to_service;

        // Header
        document.getElementById('rf-modal-model').innerText = modelCode + (m.oem ? ` — ${m.oem}` : '');
        document.getElementById('rf-modal-sn').innerText = `SN: ${m.sn || m.name}${m.fleet_no ? '  |  Fleet: ' + m.fleet_no : ''}`;

        // Header colour
        const machineDefects = window._rdDefectMap ? Object.values(window._rdDefectMap).filter(d => !d.end_date && d.machine === m.name).length : 0;
        document.getElementById('rf-modal-header').style.background = machineDefects > 0 ? '#7f1d1d' : '#1e293b';

        // Status strip
        let hrsColor = '#64748b';
        if(hrsLeft !== null && hrsLeft !== undefined) {
            if(hrsLeft <= 50) hrsColor = '#b91c1c';
            else if(hrsLeft <= 250) hrsColor = '#d97706';
        }
        document.getElementById('rf-modal-strip').innerHTML = `
            <span style="background:${isWarranty?'#d1fae5':'#f1f5f9'};color:${isWarranty?'#047857':'#64748b'};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;"><i class="fas fa-shield-alt" style="margin-right:6px;"></i>${m.warranty_status || 'N/A'}</span>
            <span style="font-size:13px;color:#64748b;">•</span>
            <span style="font-size:14px;font-weight:800;color:#0f172a;"><i class="fas fa-tachometer-alt" style="margin-right:6px;color:#64748b;"></i>${hmr.toLocaleString()} HMR</span>
            ${hrsLeft !== null && hrsLeft !== undefined ? `<span style="font-size:13px;color:#64748b;">•</span><span style="font-size:13px;font-weight:700;color:${hrsColor};">${hrsLeft <= 0 ? '⚠ SERVICE OVERDUE' : hrsLeft + ' hrs to next service'}</span>` : ''}
            ${machineDefects > 0 ? `<span style="font-size:13px;color:#64748b;">•</span><span style="font-size:12px;font-weight:700;background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:20px;">${machineDefects} active defect${machineDefects>1?'s':''}</span>` : ''}
        `;

        // Field helper
        const rf = (id, label, value, mono) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = `<div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:5px;">${label}</div><div style="font-size:14px;font-weight:600;color:#0f172a;${mono?'font-family:monospace;':''}">${value || '<span style="color:#94a3b8;">—</span>'}</div>`;
        };

        rf('rf-f-hmr', '⏱ Current HMR', `<span style="font-size:20px;font-weight:800;color:#0f172a;">${hmr.toLocaleString()} hrs</span>`);
        rf('rf-f-fleet', '🔢 Fleet No.', m.fleet_no || m.mxg_fleet_no);
        rf('rf-f-type', '🏗 Machine Type', m.type);
        rf('rf-f-oem', '🏭 OEM / Brand', m.oem);
        rf('rf-f-location', '📍 Location', m.location);
        rf('rf-f-region', '🗺 Region', m.region);
        rf('rf-f-warranty', '🛡 Warranty Status', m.warranty_status);
        rf('rf-f-warranty-type', '📋 Warranty Type', m.warranty_type);
        rf('rf-f-engine', 'âš™ Engine Type', m.engine_type);
        rf('rf-f-chassis', '🔩 Chassis No.', m.chassis_number, true);
        rf('rf-f-esn', '🔧 Engine Serial (ESN)', m.esn, true);
        rf('rf-f-telematics', '📡 Telematics', m.has_telematics_device ? '✅ Installed' : '❌ Not Installed');

        const nextServiceHmr = m.next_service_hmr || 0;
        rf('rf-f-next-service', '🎯 Next Service HMR', nextServiceHmr > 0 ? nextServiceHmr.toLocaleString() + ' hrs' : null);
        rf('rf-f-hrs-remaining', '⏳ Hours Remaining', hrsLeft !== null && hrsLeft !== undefined ? `<span style="color:${hrsColor};font-weight:800;">${hrsLeft} hrs</span>` : null);
        rf('rf-f-service-interval', '🔄 Service Interval', m.service_interval_hours ? m.service_interval_hours + ' hrs' : null);
        rf('rf-f-last-service-date', '📅 Last Service Date', m.last_service_date);
        rf('rf-f-last-service-hmr', '⏱ Last Service HMR', m.last_service_hmr ? m.last_service_hmr.toLocaleString() + ' hrs' : null);
        rf('rf-f-last-service-type', '🔧 Last Service Type', m.last_service_type);

        // Active defects on this machine
        const machineDefectsList = window._rdDefectMap ? Object.values(window._rdDefectMap).filter(d => !d.end_date && d.machine === m.name) : [];
        const defectsEl = document.getElementById('rf-modal-defects');
        if(machineDefectsList.length === 0) {
            defectsEl.innerHTML = '<div style="color:#94a3b8;font-style:italic;font-size:13px;">No active defects on this machine.</div>';
        } else {
            defectsEl.innerHTML = machineDefectsList.map(d => {
                const pri = d.priority || 'Low';
                let bc = '#64748b', bb = '#f1f5f9';
                if(pri === 'High' || pri === 'Critical') { bc = '#ef4444'; bb = '#fee2e2'; }
                else if(pri === 'Medium') { bc = '#d97706'; bb = '#fef3c7'; }
                const label = (d.name || '').replace(/-[a-f0-9]{3}$/, '');
                return `<div style="padding:10px 14px;background:white;border:1px solid #fecaca;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="document.getElementById('rf-machine-modal').style.display='none'; window.openManageDefect('${d.name}')">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#0f172a;">${label}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">${d.status || 'Open'} • ${d.defect_days || 0}d open</div>
                    </div>
                    <span style="background:${bb};color:${bc};font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;">${pri}</span>
                </div>`;
            }).join('');
        }

        document.getElementById('rf-machine-modal').style.display = 'flex';
    };

    // Tab state
    window._rdActiveHtml = '';
    window._rdArchiveHtml = '';

    window.rdShowTab = function(tab) {
        const listBody = document.getElementById('rd-list-body');
        const btnActive = document.getElementById('rd-tab-active');
        const btnArchive = document.getElementById('rd-tab-archive');
        if(!listBody) return;
        if(tab === 'active') {
            listBody.innerHTML = window._rdActiveHtml || '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic;">No active defects.</div>';
            btnActive.style.cssText = 'padding:10px 24px;border-radius:10px;border:none;font-weight:700;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#8b2219,#4c110d);color:white;box-shadow:0 4px 12px rgba(139,34,25,0.2);';
            btnArchive.style.cssText = 'padding:10px 24px;border-radius:10px;border:1px solid #e2e8f0;font-weight:700;font-size:13px;cursor:pointer;background:white;color:#64748b;';
        } else {
            listBody.innerHTML = window._rdArchiveHtml || '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic;">No archived defects.</div>';
            btnArchive.style.cssText = 'padding:10px 24px;border-radius:10px;border:none;font-weight:700;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#8b2219,#4c110d);color:white;box-shadow:0 4px 12px rgba(139,34,25,0.2);';
            btnActive.style.cssText = 'padding:10px 24px;border-radius:10px;border:1px solid #e2e8f0;font-weight:700;font-size:13px;cursor:pointer;background:white;color:#64748b;';
        }
    };

    window.loadDefectsTracking = async function() {
        const listBody = document.getElementById('rd-list-body');
        if(!listBody) return;
        
        listBody.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            const ftBaseUrl = 'https://fleetrack.machinery-exchange.com';
            const res = await window.callFrappeSequenced(ftBaseUrl, 'mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary', {});

            if(res && res.message && !res.message.error) {
                const data = res.message;
                // Cache ALL rows for the Customer Profile panel (fuzzy-matched per customer)
                window._cppAllDefects = data.rows || [];
                // Filter for SRD customers
                const srdRows = (data.rows || []).filter(r =>
                    r.customer === 'Sales and Rental Division (SRD)' || r.customer === 'Sales and Rental Division'
                );

                // Split into active (no end_date) and archive (has end_date)
                const activeRows = srdRows.filter(r => !r.end_date);
                const archiveRows = srdRows.filter(r => !!r.end_date);

                // Metrics
                const now = new Date();
                let critCount = 0;
                let resCount = 0;
                srdRows.forEach(r => {
                    const pri = r.priority || 'Low';
                    if(!r.end_date && (pri === 'High' || pri === 'Critical')) critCount++;
                    if(r.end_date) {
                        const ed = new Date(r.end_date);
                        if(Math.ceil(Math.abs(now - ed) / 86400000) <= 30) resCount++;
                    }
                });
                document.getElementById('rd-metric-active').innerText = activeRows.length;
                document.getElementById('rd-metric-critical').innerText = critCount;
                document.getElementById('rd-metric-resolved').innerText = resCount;

                // Store rows in lookup map for modal
                window._rdDefectMap = {};
                srdRows.forEach(r => { window._rdDefectMap[r.name] = r; });

                // Build row HTML helper
                const COLS = '130px 75px 150px 1fr 130px 120px 100px 55px 80px 190px 100px 75px';
                const buildRow = (row) => {
                    const modelParts = (row.model || '').split('-');
                    const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (row.model || '-');
                    const pri = row.priority || 'Low';
                    const status = row.status || 'Open';
                    const daysNum = row.defect_days || 0;
                    let daysColor = '#64748b';
                    if(daysNum > 30) daysColor = '#b91c1c';
                    else if(daysNum > 14) daysColor = '#d97706';
                    else if(daysNum > 7) daysColor = '#f59e0b';
                    let badgeColor = '#64748b', badgeBg = '#f1f5f9';
                    if(pri === 'High' || pri === 'Critical') { badgeColor = '#ef4444'; badgeBg = '#fee2e2'; }
                    else if(pri === 'Medium') { badgeColor = '#d97706'; badgeBg = '#fef3c7'; }
                    let statColor = '#3b82f6', statBg = '#eff6ff';
                    if(row.end_date) { statColor = '#10b981'; statBg = '#d1fae5'; }
                    const tedDisplay = row.ted ? row.ted : (row.end_date ? `<span style="color:#10b981;font-weight:700;">${row.end_date}</span>` : '<span style="color:#94a3b8;">—</span>');
                    // Strip trailing hash suffix from defect name for display
                    const defectLabel = (row.name || '').replace(/-[a-f0-9]{3}$/, '');
                    return `
                        <div style="border-bottom:1px solid #f1f5f9;padding:14px 24px;display:grid;grid-template-columns:${COLS};gap:12px;align-items:start;min-width:1500px;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                            <div style="font-size:12px;font-weight:700;color:#334155;">${modelCode}</div>
                            <div style="font-size:12px;font-weight:800;color:#1e40af;">${row.oem || '-'}</div>
                            <div style="font-size:11px;font-weight:700;color:#0f172a;font-family:monospace;">${row.machine || '-'}</div>
                            <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.4;word-wrap:break-word;">${defectLabel}</div>
                            <div style="font-size:12px;color:#64748b;word-wrap:break-word;">${row.location || '-'}</div>
                            <div><span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;background:${row.warranty_status==='Under Warranty'?'#d1fae5':'#f1f5f9'};color:${row.warranty_status==='Under Warranty'?'#047857':'#64748b'};">${row.warranty_status || 'N/A'}</span></div>
                            <div style="font-size:12px;color:#64748b;">${row.start_date || '-'}</div>
                            <div style="font-size:13px;font-weight:800;color:${daysColor};">${daysNum}d</div>
                            <div><span style="background:${badgeBg};color:${badgeColor};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;">${pri}</span></div>
                            <div><span style="background:${statBg};color:${statColor};padding:4px 8px;border-radius:10px;font-size:11px;font-weight:700;display:block;white-space:normal;word-wrap:break-word;">${status}</span></div>
                            <div style="font-size:12px;color:#475569;">${tedDisplay}</div>
                            <div><button onclick="window.openManageDefect('${row.name}')" style="background:white;border:1px solid #cbd5e1;color:#0f172a;padding:5px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">View</button></div>
                        </div>`;
                };

                window._rdActiveHtml = activeRows.length > 0
                    ? activeRows.map(buildRow).join('')
                    : '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic;">No active defects.</div>';

                window._rdArchiveHtml = archiveRows.length > 0
                    ? archiveRows.map(buildRow).join('')
                    : '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic;">No archived defects.</div>';

                // Show active tab by default
                window.rdShowTab('active');

            } else {
                listBody.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Error loading defects: ${res?.message?.error || 'Unknown network error'}</div>`;
            }
        } catch(e) {
            console.error(e);
            listBody.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to connect to Fleetrack API.</div>';
        }
    };

    // ============================================================
    // REPORT DEFECT — Machine Autocomplete (SRD only)
    // ============================================================

    window._rdSrdMachines = [];

    window.openReportDefectModal = async function() {
        document.getElementById('rd-add-modal').style.display = 'flex';
        // Reset form state
        document.getElementById('rd-add-machine').value = '';
        document.getElementById('rd-add-machine-name').value = '';
        document.getElementById('rd-add-desc').value = '';
        document.getElementById('rd-machine-selected').style.display = 'none';
        document.getElementById('rd-machine-dropdown').style.display = 'none';
        document.getElementById('rd-add-error').style.display = 'none';

        // Pre-warm SRD machines (reuse any existing cache)
        if(!window._rdSrdMachines.length) {
            let all = window._rfAllMachines || window._fmAllMachines;
            if(!all || !all.length) {
                try {
                    const ftBase = 'https://fleetrack.machinery-exchange.com';
                    const res = await window.callFrappeSequenced(ftBase, 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', {});
                    all = res?.data || res?.message?.data || [];
                    window._fmAllMachines = all;
                } catch(e) { all = []; }
            }
            // Filter to SRD machines only
            window._rdSrdMachines = (all || []).filter(m => {
                const c = (m.customer || '').toLowerCase();
                return c.includes('sales and rental') || c.includes('srd') || c === 'sales & rental division';
            });
        }
        // Trigger initial empty search to pre-populate dropdown
        window.rdMachineSearch('');
    };

    window.rdMachineSearch = function(q) {
        const dropdown = document.getElementById('rd-machine-dropdown');
        if(!dropdown) return;
        const term = (q || '').toLowerCase().trim();
        const pool = window._rdSrdMachines;

        if(!pool.length) {
            dropdown.style.display = 'block';
            dropdown.innerHTML = '<div style="padding:12px 16px;color:#94a3b8;font-size:13px;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Loading SRD machines…</div>';
            return;
        }

        const filtered = term
            ? pool.filter(m =>
                (m.model||'').toLowerCase().includes(term) ||
                (m.sn||'').toLowerCase().includes(term) ||
                (m.fleet_no||m.mxg_fleet_no||'').toLowerCase().includes(term) ||
                (m.location||'').toLowerCase().includes(term) ||
                (m.name||'').toLowerCase().includes(term)
              )
            : pool;

        if(!filtered.length) {
            dropdown.style.display = 'block';
            dropdown.innerHTML = '<div style="padding:12px 16px;color:#94a3b8;font-size:13px;">No SRD machines match your search.</div>';
            return;
        }

        dropdown.style.display = 'block';
        dropdown.innerHTML = filtered.slice(0, 40).map(m => {
            const modelParts = (m.model||'').split('-');
            const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||m.name);
            const serial = m.sn || '—';
            const fleet = m.fleet_no || m.mxg_fleet_no || '—';
            const locBit = m.location ? ` · ${m.location}` : '';
            const safeName = m.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            return `<div onclick="window.rdMachineSelect('${safeName}')"
                style="padding:10px 16px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; transition:background 0.1s;"
                onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                <div>
                    <div style="font-weight:700;font-size:13px;color:#0f172a;">${modelCode} <span style="font-size:11px;font-weight:400;color:#64748b;">${m.oem||''}</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;font-family:monospace;">SN: ${serial} &nbsp;·&nbsp; Fleet: ${fleet}${locBit}</div>
                </div>
                <i class="fas fa-chevron-right" style="font-size:10px;color:#cbd5e1;"></i>
            </div>`;
        }).join('');
    };

    window.rdMachineSelect = function(machineName) {
        const m = (window._rdSrdMachines || []).find(x => x.name === machineName);
        if(!m) return;
        const modelParts = (m.model||'').split('-');
        const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||m.name);
        const serial = m.sn ? ` · SN: ${m.sn}` : '';
        const fleet  = (m.fleet_no||m.mxg_fleet_no) ? ` · Fleet: ${m.fleet_no||m.mxg_fleet_no}` : '';
        const label  = `${modelCode}${serial}${fleet}`;

        document.getElementById('rd-add-machine').value = label;
        document.getElementById('rd-add-machine-name').value = m.name;
        document.getElementById('rd-machine-dropdown').style.display = 'none';
        document.getElementById('rd-machine-selected').style.display = 'block';
        document.getElementById('rd-machine-selected-label').innerText = label;
        document.getElementById('rd-add-error').style.display = 'none';
    };

    window.submitNewDefect = async function(btn) {
        // Use the hidden field (set by autocomplete selection) or fall back to text
        const machine = document.getElementById('rd-add-machine-name').value.trim()
                     || document.getElementById('rd-add-machine').value.trim();
        const type = document.getElementById('rd-add-type').value;
        const priority = document.getElementById('rd-add-priority').value;
        const desc = document.getElementById('rd-add-desc').value.trim();
        const errEl = document.getElementById('rd-add-error');
        
        errEl.style.display = 'none';
        
        if(!machine) {
            errEl.innerText = 'Please select a machine from the list.';
            errEl.style.display = 'block';
            document.getElementById('rd-add-machine').focus();
            return;
        }
        if(!desc) {
            errEl.innerText = 'Description is required.';
            errEl.style.display = 'block';
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        try {
            const res = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl.replace(/\/$/, ''), 'mxg_fleet_track.ft_defects_dashboard.create_ft_defect', {
                    machine: machine,
                    defect_type: type,
                    priority: priority,
                    description: desc
                });
            
            if(res && res.message && res.message.ok) {
                if(window.omnisLog) window.omnisLog("Defect successfully logged to Fleetrack!", "success");
                document.getElementById('rd-add-modal').style.display = 'none';
                
                // Clear fields
                document.getElementById('rd-add-machine').value = '';
                document.getElementById('rd-add-machine-name').value = '';
                document.getElementById('rd-add-desc').value = '';
                document.getElementById('rd-machine-selected').style.display = 'none';
                document.getElementById('rd-machine-selected-label').innerText = '';
                
                window.loadDefectsTracking();
            } else {
                errEl.innerText = res?.message?.error || "Failed to create defect.";
                errEl.style.display = 'block';
            }
        } catch(e) {
            console.error(e);
            errEl.innerText = "Network Error.";
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Submit';
        }
    };
    
    window.openManageDefect = function(name) {
        const row = (window._rdDefectMap || {})[name];
        if(!row) { alert('Defect data not found. Please refresh.'); return; }

        // Priority colour
        const pri = row.priority || 'Low';
        let priColor = '#64748b', priBg = 'rgba(100,116,139,0.2)';
        if(pri === 'High' || pri === 'Critical') { priColor = '#ef4444'; priBg = 'rgba(239,68,68,0.2)'; }
        else if(pri === 'Medium') { priColor = '#f59e0b'; priBg = 'rgba(245,158,11,0.2)'; }

        // Header accent based on priority
        const headerBg = (pri === 'High' || pri === 'Critical') ? '#7f1d1d' : (pri === 'Medium' ? '#78350f' : '#1e293b');
        document.getElementById('rd-view-header').style.background = headerBg;

        // Priority badge
        const badge = document.getElementById('rd-view-priority-badge');
        badge.innerText = pri;
        badge.style.background = priBg;
        badge.style.color = priColor;
        badge.style.border = `1px solid ${priColor}`;

        // Title = defect name stripped of hash suffix
        const defectLabel = (row.name || '').replace(/-[a-f0-9]{3}$/, '');
        document.getElementById('rd-view-title').innerText = defectLabel;
        document.getElementById('rd-view-id').innerText = row.name;

        // Status bar
        const status = row.status || 'Open';
        const isArchived = !!row.end_date;
        const daysNum = row.defect_days || 0;
        let daysColor = '#64748b';
        if(daysNum > 30) daysColor = '#b91c1c';
        else if(daysNum > 14) daysColor = '#d97706';
        else if(daysNum > 7) daysColor = '#f59e0b';
        document.getElementById('rd-view-statusbar').innerHTML = `
            <span style="background:${isArchived?'#d1fae5':'#eff6ff'}; color:${isArchived?'#047857':'#1d4ed8'}; padding:5px 14px; border-radius:20px; font-size:12px; font-weight:700;">${status}</span>
            <span style="font-size:13px; color:#64748b;">•</span>
            <span style="font-size:13px; font-weight:700; color:${daysColor};"><i class="fas fa-clock" style="margin-right:6px;"></i>${daysNum} day${daysNum!==1?'s':''} open</span>
            ${row.warranty_status ? `<span style="font-size:13px; color:#64748b;">•</span><span style="font-size:13px; font-weight:700; color:${row.warranty_status==='Under Warranty'?'#047857':'#64748b'};"><i class="fas fa-shield-alt" style="margin-right:6px;"></i>${row.warranty_status}</span>` : ''}
            ${isArchived ? '<span style="font-size:13px; color:#64748b;">•</span><span style="font-size:12px; font-weight:700; background:#dcfce7; color:#15803d; padding:4px 12px; border-radius:20px;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Archived</span>' : ''}
        `;

        // Field helper
        const field = (id, label, value, mono) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = `
                <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:5px;">${label}</div>
                <div style="font-size:14px;font-weight:600;color:#0f172a;${mono?'font-family:monospace;':''} line-height:1.4;">${value || '<span style="color:#94a3b8;">—</span>'}</div>
            `;
        };

        const modelParts = (row.model || '').split('-');
        const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (row.model || '');

        field('rd-view-f-machine', 'Serial Number', row.machine, true);
        field('rd-view-f-oem', 'OEM / Brand', row.oem);
        field('rd-view-f-model', 'Model', modelCode + (row.model ? ` <span style="color:#94a3b8;font-size:12px;">(${row.model})</span>` : ''));
        field('rd-view-f-location', '📍 Location', row.location);
        field('rd-view-f-warranty', '🛡 Warranty Status', row.warranty_status);
        field('rd-view-f-reported', '📅 Date Reported', row.start_date);
        field('rd-view-f-days', '⏱ Days Open', `<span style="color:${daysColor};font-size:18px;font-weight:800;">${daysNum}d</span>`);
        field('rd-view-f-ted', '🎯 Target End Date (TED)', row.ted);
        field('rd-view-f-enddate', '✅ Breakdown End Date', row.end_date ? `<span style="color:#047857;">${row.end_date}</span>` : null);
        field('rd-view-f-type', '🔧 Defect Type', row.defect_type);
        document.getElementById('rd-view-desc').innerText = row.description || 'No description provided.';

        // Show modal
        const modal = document.getElementById('rd-view-modal');
        modal.style.display = 'flex';
    };

window.loadCreditTermsDashboard = async function() {
        try {
            // Load Deals
            let res = await window.electron.invoke('supabase:query', { table: 'payment_deals', method: 'select', params:{columns:'*'} });
            if(res.ok) allDeals = res.data || [];

            // Load Installments
            res = await window.electron.invoke('supabase:query', { table: 'payment_installments', method: 'select', params:{columns:'*'} });
            if(res.ok) allInstallments = res.data || [];

            // Load Customers for mapping
            res = await window.electron.invoke('cache:getAll', 'customers');
            if(res.ok && res.data) {
                customersList = res.data;
                const sel = document.getElementById('ct-new-customer');
                if(sel.options.length <= 1) {
                    res.data.sort((a,b)=>a.customer_name.localeCompare(b.customer_name)).forEach(c => {
                        sel.innerHTML += `<option value="${c.frappe_id}" data-name="${c.customer_name}">${c.customer_name}</option>`;
                    });
                }
            }
            
            // Load Pending Setups (Expanded per machine unit)
            let fmbRes = await window.electron.invoke('supabase:query', { table: 'fmb_reports', method: 'select', params:{columns:'id, frappe_id, customer_id, is_payment_terms'}});
            let macRes = await window.electron.invoke('supabase:query', { table: 'order_machines', method: 'select', params:{columns:'order_id, item_code, quantity'}});
            
            if(fmbRes.ok && fmbRes.data && macRes.ok && macRes.data) {
                const termOrders = fmbRes.data.filter(r => r.id && r.is_payment_terms === true);
                let expandedPending = [];

                termOrders.forEach(order => {
                    const machines = macRes.data.filter(m => m.order_id === order.id);
                    machines.forEach(machine => {
                        const qty = parseInt(machine.quantity) || 1;
                        // Count how many deals already exist for this order_id AND item_id
                        const existingDealsCount = allDeals.filter(d => d.order_id === order.id && d.item_id === machine.item_code).length;
                        
                        // We only queue the REMAINING unfulfilled units
                        const remainingQty = qty - existingDealsCount;
                        
                        for(let i = 0; i < remainingQty; i++) {
                            expandedPending.push({
                                order_id: order.id,
                                frappe_id: order.frappe_id,
                                customer_id: order.customer_id,
                                item_code: machine.item_code,
                                unit_index: i + 1,
                                total_qty: qty
                            });
                        }
                    });
                });
                
                allPendingSetups = expandedPending;
            } else {
                allPendingSetups = [];
            }

            renderCommercialDashboard();
        } catch(e) { console.error('Error loading terms dashboard', e); }
    };

    function renderCommercialDashboard() {
        let activeCount = 0;
        let totalPrincipal = 0;
        let totalInterest = 0;
        let overdueCount = 0;
        let upcomingCount = 0;

        const grid = document.getElementById('ct-deals-grid');
        grid.innerHTML = '';
        
        const pendingGrid = document.getElementById('ct-pending-deals-grid');
        if(pendingGrid) pendingGrid.innerHTML = '';

        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        const now = new Date();
        now.setHours(0,0,0,0);

        allDeals.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(deal => {
            if(deal.status === 'Active') {
                activeCount++;
                totalPrincipal += deal.principal_amount;
                totalInterest += deal.interest_amount;
            }

            const insts = allInstallments.filter(i => i.deal_id === deal.id);
            let dealOverdue = 0;
            
            insts.forEach(i => {
                const due = new Date(i.due_date);
                if(i.status === 'Pending') {
                    if (due < now) {
                        overdueCount++;
                        dealOverdue++;
                    } else {
                        const in7Days = new Date(now);
                        in7Days.setDate(in7Days.getDate() + 7);
                        if (due <= in7Days) {
                            upcomingCount++;
                        }
                    }
                }
            });

            const custName = customersList.find(c => c.frappe_id === deal.customer_id)?.customer_name || deal.customer_id;

            grid.innerHTML += `
                <div style="border:1px solid #e2e8f0; border-radius:12px; padding:20px; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s; background:${dealOverdue > 0 ? '#fef2f2' : 'white'}; border-left:4px solid ${dealOverdue > 0 ? '#ef4444' : '#3b82f6'};">
                    <div style="flex:2;">
                        <div style="font-size:11px; font-weight:800; color:#64748b; margin-bottom:4px;">${deal.deal_reference}</div>
                        <h3 style="margin:0 0 4px 0; font-size:16px; font-weight:800; color:#1e293b;">${custName}</h3>
                        <div style="font-size:13px; color:#64748b;">${deal.item_id}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Principal</div>
                        <div style="font-size:16px; font-weight:700; color:#0f172a;">${fmt.format(deal.principal_amount)}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Payable</div>
                        <div style="font-size:16px; font-weight:700; color:#10b981;">${fmt.format(deal.total_payable)}</div>
                    </div>
                    <div style="flex:1; text-align:center;">
                        <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</div>
                        <div style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800; margin-top:4px; ${dealOverdue > 0 ? 'background:#fee2e2; color:#ef4444;' : 'background:#e0e7ff; color:#4f46e5;'}">${dealOverdue > 0 ? dealOverdue + ' OVERDUE' : deal.status}</div>
                    </div>
                    <div>
                        <button onclick="window.openManageDeal('${deal.id}')" style="background:white; border:1px solid #cbd5e1; color:#0f172a; padding:8px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05);">Manage Deal</button>
                    </div>
                </div>
            `;
        });

        if(allDeals.length === 0) grid.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No active payment deals found.</div>';

        // Render Pending Setups
        if(pendingGrid) {
            if(allPendingSetups && allPendingSetups.length > 0) {
                allPendingSetups.forEach(setup => {
                    const custName = customersList.find(c => c.frappe_id === setup.customer_id)?.customer_name || setup.customer_id;
                    pendingGrid.innerHTML += `
                        <div style="border:1px dashed #f59e0b; border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center; background:#fffbeb; margin-bottom:12px;">
                            <div>
                                <div style="font-size:11px; font-weight:800; color:#d97706; margin-bottom:4px; text-transform:uppercase;">PENDING SETUP (Unit ${setup.unit_index} of ${setup.total_qty})</div>
                                <h3 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:#92400e;">${custName}</h3>
                                <div style="font-size:13px; font-weight:700; color:#b45309; margin-bottom:2px;">1x ${setup.item_code}</div>
                                <div style="font-size:11px; color:#d97706;">Order: ${setup.frappe_id}</div>
                            </div>
                            <div>
                                <button onclick="window.openNewDealModal('${setup.order_id}', '${setup.customer_id}', '${(setup.item_code || '').replace(/'/g, "\\'")}')" style="background:#f59e0b; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer;"><i class="fas fa-magic"></i> Generate Contract</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                pendingGrid.innerHTML = '<div style="padding:20px; text-align:center; color:#d97706; font-style:italic;">No pending setups.</div>';
            }
        }

        document.getElementById('ct-metric-active').innerText = activeCount;
        document.getElementById('ct-metric-principal').innerText = fmt.format(totalPrincipal);
        document.getElementById('ct-metric-interest').innerText = fmt.format(totalInterest);
        document.getElementById('ct-metric-overdue').innerText = overdueCount;
        const upcomingEl = document.getElementById('ct-metric-upcoming');
        if(upcomingEl) upcomingEl.innerText = upcomingCount;
    }

    window.openNewDealModal = async function(orderId = null, customerIdOrName = null, itemCode = null) {
        document.getElementById('ct-new-deal-modal').style.display = 'flex';
        
        const custSelect = document.getElementById('ct-new-customer');
        if(customerIdOrName) {
            let found = false;
            // 1. Try matching the value (frappe_id)
            for (let i = 0; i < custSelect.options.length; i++) {
                if (custSelect.options[i].value === customerIdOrName) {
                    custSelect.selectedIndex = i;
                    found = true; break;
                }
            }
            // 2. If not found, try matching the text or data-name
            if (!found) {
                for (let i = 0; i < custSelect.options.length; i++) {
                    if (custSelect.options[i].text === customerIdOrName || custSelect.options[i].getAttribute('data-name') === customerIdOrName) {
                        custSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        window.currentSetupOrderId = orderId;

        if (orderId) {
            const itemInput = document.getElementById('ct-new-item');
            if (itemCode) {
                itemInput.value = itemCode;
            } else {
                itemInput.value = "Loading items...";
                try {
                    // Fetch all machines since match proxy is limited without restart, filter locally
                    const mRes = await window.electron.invoke('supabase:query', {
                        table: 'order_machines',
                        method: 'select',
                        params: { columns: 'order_id, item_code, quantity' }
                    });
                    
                    if (mRes.ok && mRes.data) {
                        const machines = mRes.data.filter(m => m.order_id === orderId);
                        if (machines.length > 0) {
                            itemInput.value = machines.map(m => `${m.quantity}x ${m.item_code}`).join(', ');
                        } else {
                            itemInput.value = "";
                        }
                    } else {
                        itemInput.value = "";
                    }
                } catch (e) {
                    console.error("Failed to fetch order machines", e);
                    itemInput.value = "";
                }
            }
        } else {
            document.getElementById('ct-new-item').value = "";
        }

        window.calculateNewDeal();
    };

    window.calculateNewDeal = function() {
        const principal = parseFloat(document.getElementById('ct-new-principal').value) || 0;
        const rate = parseFloat(document.getElementById('ct-new-rate').value) || 0;
        const months = parseInt(document.getElementById('ct-new-months').value) || 1;

        const interest = principal * (rate / 100);
        const total = principal + interest;
        const monthAmt = total / months;

        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        document.getElementById('ct-new-calc-interest').innerText = fmt.format(interest);
        document.getElementById('ct-new-calc-total').innerText = fmt.format(total);
        document.getElementById('ct-new-calc-month').innerText = fmt.format(monthAmt);
    };

    
    window.flagOrderForTerms = async function(frappeId, customer, item) {
        if(!confirm(`Flag Order ${frappeId} for Payment Terms? This will send it to the Commercial Queue.`)) return;
        try {
            const btn = event.currentTarget;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            const res = await window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'upsert',
                data: { frappe_id: frappeId, customer_id: customer, is_payment_terms: true },
                params: { onConflict: 'frappe_id', select: '*' }
            });

            if(res.ok && res.data && res.data.length > 0) {
                const uuid = res.data[0].id;
                // Also upsert into order_machines to save the item string
                await window.electron.invoke('supabase:query', {
                    table: 'order_machines',
                    method: 'upsert',
                    data: { order_id: uuid, machine_id: item },
                    params: { onConflict: 'order_id', select: '*' }
                });
                
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.color = '#10b981';
                if(window.omnisLog) window.omnisLog('Order sent to Commercial Queue.', 'success');
            } else {
                throw new Error("Failed to return FMB UUID");
            }
        } catch(e) {
            alert('Error flagging order: ' + e.message);
        }
    };

    window.saveNewDeal = async function() {
        const cid = document.getElementById('ct-new-customer').value;
        const item = document.getElementById('ct-new-item').value;
        const principal = parseFloat(document.getElementById('ct-new-principal').value) || 0;
        const rate = parseFloat(document.getElementById('ct-new-rate').value) || 0;
        const months = parseInt(document.getElementById('ct-new-months').value) || 1;
        const startDateStr = document.getElementById('ct-new-start').value;

        if(!cid || !item || principal <= 0 || !startDateStr) {
            alert('Please fill out all fields.');
            return;
        }

        const btn = document.getElementById('ct-save-deal-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;

        try {
            // Check Credit Profile existence
            let profRes = await window.electron.invoke('supabase:query', { table: 'customer_credit_profiles', method: 'select', params:{columns:'*', match:{customer_id: cid}} });
            if(profRes.ok && (!profRes.data || profRes.data.length === 0)) {
                await window.electron.invoke('supabase:query', { table: 'customer_credit_profiles', method: 'insert', data: { customer_id: cid,
                        order_id: currentSetupOrderId, credit_score: 800, credit_status: 'Good' } });
            }

            // Create Deal
            const ref = 'PD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const interest = principal * (rate / 100);
            const total = principal + interest;
            
            let dealRes = await window.electron.invoke('supabase:query', { 
                table: 'payment_deals', 
                method: 'insert', 
                data: {
                    deal_reference: ref,
                    customer_id: cid,
                        order_id: currentSetupOrderId,
                    item_id: item,
                    principal_amount: principal,
                    interest_rate: rate,
                    interest_amount: interest,
                    total_payable: total,
                    start_date: startDateStr,
                    status: 'Active'
                }
            });

            if(!dealRes.ok) throw new Error(dealRes.error);

            // Fetch the generated deal ID to link installments
            const fetchRes = await window.electron.invoke('supabase:query', { table: 'payment_deals', method: 'select', params:{columns:'id', match:{deal_reference: ref}} });
            const dealId = fetchRes.data[0].id;

            // Generate Installments
            const monthAmt = total / months;
            const startD = new Date(startDateStr);
            
            for(let i=1; i<=months; i++) {
                let due = new Date(startD);
                due.setMonth(due.getMonth() + i);
                
                await window.electron.invoke('supabase:query', { 
                    table: 'payment_installments', 
                    method: 'insert', 
                    data: {
                        deal_id: dealId,
                        installment_number: i,
                        due_date: due.toISOString().split('T')[0],
                        amount_due: monthAmt,
                        status: 'Pending'
                    }
                });
            }

            if(window.omnisLog) window.omnisLog('Payment Deal & Installments generated successfully.', 'success');
            document.getElementById('ct-new-deal-modal').style.display = 'none';
            window.loadCreditTermsDashboard();

        } catch(e) {
            console.error(e);
            alert('Failed to generate deal: ' + e.message);
        } finally {
            btn.innerHTML = '<i class="fas fa-check"></i> Finalize & Generate Schedule';
            btn.disabled = false;
        }
    };

    window.openManageDeal = async function(dealId) {
        const deal = allDeals.find(d => d.id === dealId);
        if(!deal) return;
        
        const custName = customersList.find(c => c.frappe_id === deal.customer_id)?.customer_name || deal.customer_id;
        let custEmail = customersList.find(c => c.frappe_id === deal.customer_id)?.email_id || '';
        
        document.getElementById('ct-manage-title').innerText = deal.deal_reference;
        document.getElementById('ct-manage-subtitle').innerText = `${custName} | ${deal.item_id}`;

        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        document.getElementById('ct-manage-status').innerText = deal.status;
        document.getElementById('ct-manage-principal').innerText = fmt.format(deal.principal_amount);
        document.getElementById('ct-manage-total').innerText = fmt.format(deal.total_payable);

        // Fetch Credit Score
        let profRes = await window.electron.invoke('supabase:query', { table: 'customer_credit_profiles', method: 'select', params:{columns:'*', match:{customer_id: deal.customer_id}} });
        let score = 800;
        let cstatus = 'Good';
        if(profRes.ok && profRes.data && profRes.data.length > 0) {
            score = profRes.data[0].credit_score;
            cstatus = profRes.data[0].credit_status;
        }
        
        const scoreEl = document.getElementById('ct-manage-score');
        const statEl = document.getElementById('ct-manage-score-status');
        scoreEl.innerText = score;
        statEl.innerText = cstatus.toUpperCase();
        
        if(score >= 700) { scoreEl.style.color = '#10b981'; statEl.style.background = '#10b981'; }
        else if(score >= 500) { scoreEl.style.color = '#f59e0b'; statEl.style.background = '#f59e0b'; }
        else { scoreEl.style.color = '#ef4444'; statEl.style.background = '#ef4444'; }

        // Render Installments
        const insts = allInstallments.filter(i => i.deal_id === deal.id).sort((a,b)=> a.installment_number - b.installment_number);
        const listEl = document.getElementById('ct-installments-list');
        listEl.innerHTML = '';

        const now = new Date();
        now.setHours(0,0,0,0);

        insts.forEach(i => {
            const due = new Date(i.due_date);
            const isOverdue = i.status === 'Pending' && due < now;
            
            let actionHtml = '';
            
            if(i.status === 'Pending') {
                const due = new Date(i.due_date);
                const isOverdue = due < now;
                const in7Days = new Date(now);
                in7Days.setDate(in7Days.getDate() + 7);
                const isUpcoming = due >= now && due <= in7Days;

                actionHtml = `<button onclick="window.markInstallmentPaid('${i.id}', '${deal.customer_id}', ${isOverdue})" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">Mark Paid</button>`;
                
                if(isOverdue) {
                    const subject = encodeURIComponent(`Payment Reminder: Overdue Installment for ${deal.deal_reference}`);
                    const body = encodeURIComponent(`Dear ${custName},

This is a friendly reminder that installment #${i.installment_number} for your deal ${deal.deal_reference} (${deal.item_id}) was due on ${i.due_date}.

Amount Due: ${fmt.format(i.amount_due)}

Please arrange payment at your earliest convenience to avoid impact on your credit rating.

Thank you,
Commercial Team`);
                    const mailto = `mailto:${custEmail}?subject=${subject}&body=${body}`;
                    actionHtml += `<a href="${mailto}" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; text-decoration:none; margin-left:6px;"><i class="fas fa-envelope"></i> Send Reminder</a>`;
                } else if(isUpcoming) {
                    const subject = encodeURIComponent(`Upcoming Payment: Installment for ${deal.deal_reference}`);
                    const body = encodeURIComponent(`Dear ${custName},

This is a proactive reminder that installment #${i.installment_number} for your deal ${deal.deal_reference} (${deal.item_id}) is due next week on ${i.due_date}.

Amount Due: ${fmt.format(i.amount_due)}

Thank you for your continued business.

Commercial Team`);
                    const mailto = `mailto:${custEmail}?subject=${subject}&body=${body}`;
                    actionHtml += `<a href="${mailto}" style="background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; text-decoration:none; margin-left:6px;"><i class="fas fa-envelope"></i> Send Upcoming Reminder</a>`;
                }
            } else {

                actionHtml = `<span style="font-size:11px; font-weight:800; color:#10b981;">PAID ${i.paid_date}</span>`;
            }

            listEl.innerHTML += `
                <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; background:${isOverdue ? '#fef2f2' : (i.status==='Paid' ? '#f8fafc' : 'white')};">
                    <div>
                        <div style="font-size:11px; font-weight:800; color:#64748b;">INSTALLMENT #${i.installment_number}</div>
                        <div style="font-size:14px; font-weight:800; color:#1e293b; margin-top:2px;">${fmt.format(i.amount_due)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px; color:#64748b; margin-bottom:4px;">Due: ${i.due_date}</div>
                        ${actionHtml}
                    </div>
                </div>
            `;
        });

        document.getElementById('ct-manage-deal-modal').style.display = 'flex';
    };

    window.markInstallmentPaid = async function(instId, customerId, wasOverdue) {
        try {
            // Update Installment
            const today = new Date().toISOString().split('T')[0];
            await window.electron.invoke('supabase:query', {
                table: 'payment_installments',
                method: 'upsert',
                data: { id: instId, status: 'Paid', paid_date: today }
            });

            // Adjust Credit Score: +10 if on time, -30 if overdue
            const adjustment = wasOverdue ? -30 : 10;
            
            // Get current score
            let profRes = await window.electron.invoke('supabase:query', { table: 'customer_credit_profiles', method: 'select', params:{columns:'*', match:{customer_id: customerId}} });
            if(profRes.ok && profRes.data && profRes.data.length > 0) {
                let prof = profRes.data[0];
                let newScore = prof.credit_score + adjustment;
                if(newScore > 1000) newScore = 1000;
                if(newScore < 0) newScore = 0;
                
                let newStat = 'Good';
                if(newScore < 500) newStat = 'Warning';
                if(newScore < 300) newStat = 'Blocked';

                await window.electron.invoke('supabase:query', {
                    table: 'customer_credit_profiles',
                    method: 'upsert',
                    data: { customer_id: customerId, credit_score: newScore, credit_status: newStat }
                });
                
                if(window.omnisLog) window.omnisLog(`Installment Paid. Credit Score updated (${adjustment>0?'+':''}${adjustment}).`, 'success');
            }

            // Reload data
            document.getElementById('ct-manage-deal-modal').style.display = 'none';
            window.loadCreditTermsDashboard();

        } catch(e) {
            console.error(e);
            alert("Error updating payment: " + e.message);
        }
    };

})();
