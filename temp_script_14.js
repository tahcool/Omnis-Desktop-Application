
(function() {
    'use strict';

    // ── State ──
    let _aftersalesRecords = [];
    let _aftersalesLoaded = false;

    // ── Load aftersales records from Supabase + Order Tracking ──
    window.loadAftersalesRecords = async function() {
        const body = document.getElementById('aftersales-list-body');
        if (!body) return;

        body.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; padding:60px 0; color:#94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size:24px; margin-right:12px;"></i>
            <span style="font-size:15px; font-weight:600;">Loading aftersales records...</span>
        </div>`;

        try {
            // 1. Load saved aftersales records from Supabase IPC cache
            let records = [];
            if (window.cacheAPI && typeof window.cacheAPI.getAll === 'function') {
                records = await window.cacheAPI.getAll('aftersales_handover');
            }
            if (!records || (Array.isArray(records) && records.length === 0)) {
                if (window.syncAPI && typeof window.syncAPI.query === 'function') {
                    records = await window.syncAPI.query('aftersales_handover', { order: 'created_at.desc' });
                }
            }
            // Normalize: cacheAPI may return an object keyed by ID instead of an array
            if (records && !Array.isArray(records)) {
                records = Object.values(records);
            }
            records = Array.isArray(records) ? records : [];

            // 2. Scan Order Tracking data for "Handed Over" orders
            //    If OT data not loaded yet, trigger the fetch
            let orderTrackingData = window.olOrdersData || [];
            if ((!orderTrackingData || orderTrackingData.length === 0) && window.dashManager && window.dashManager.ordersData) {
                orderTrackingData = window.dashManager.ordersData;
            }

            // If still no data, trigger Order Tracking fetch and wait for it
            if (!orderTrackingData || orderTrackingData.length === 0) {
                console.log('[Aftersales] No Order Tracking data loaded — fetching now...');
                try {
                    if (typeof loadOrdersList === 'function') {
                        await loadOrdersList(true);
                    } else if (typeof window.loadOrdersList === 'function') {
                        await window.loadOrdersList(true);
                    }
                    // Re-read after fetch
                    orderTrackingData = window.olOrdersData || [];
                    if ((!orderTrackingData || orderTrackingData.length === 0) && window.dashManager && window.dashManager.ordersData) {
                        orderTrackingData = window.dashManager.ordersData;
                    }
                } catch (fetchErr) {
                    console.warn('[Aftersales] Could not fetch Order Tracking:', fetchErr);
                }
            }

            console.log(`[Aftersales] Order Tracking data available: ${Array.isArray(orderTrackingData) ? orderTrackingData.length : 0} records`);

            if (Array.isArray(orderTrackingData) && orderTrackingData.length > 0) {
                // Debug: log a sample record and all unique statuses
                console.log('[Aftersales] Sample order record keys:', Object.keys(orderTrackingData[0]));
                const allStatuses = [...new Set(orderTrackingData.map(o => o.status || o.phase || ''))];
                console.log('[Aftersales] All statuses found:', allStatuses);

                // Build a set of order_ids already in our aftersales records
                const existingOrderIds = new Set(records.map(r => r.order_id).filter(Boolean));

                // Filter for handed-over / delivered / ready orders
                const handedOverOrders = orderTrackingData.filter(o => {
                    const s = (o.status || o.phase || '').toLowerCase();
                    return s.includes('handover') || s.includes('handed over') || s.includes('delivered') || s.includes('ready') || s.includes('complete');
                });

                console.log(`[Aftersales] Found ${handedOverOrders.length} handed-over orders in Order Tracking`);
                if (handedOverOrders.length > 0) {
                    console.log('[Aftersales] First handed-over record:', JSON.stringify(handedOverOrders[0]).substring(0, 500));
                }

                // Create aftersales records for ones we haven't seen yet
                for (const o of handedOverOrders) {
                    const orderId = o.report_id || o.name || o.machine_id || '';
                    if (!orderId || existingOrderIds.has(orderId)) continue;

                    const newRecord = {
                        id: 'AS-OT-' + orderId.replace(/[^a-zA-Z0-9]/g, '-'),
                        order_id: orderId,
                        company: o.customer || o.customer_id || o.company || '',
                        equipment_model: o.machine || o.item_code || o.model || '',
                        chassis_number: o.serial_no || o.chassis_number || '',
                        oem: o.brand || o.oem || '',
                        date_of_sale: o.order_date || '',
                        location: o.location || '',
                        handover_date: o.revised_handover || o.target_handover || '',
                        handover_salesperson: o.salesperson || '',
                        notes: o.notes || '',
                        status: 'Pending',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    records.push(newRecord);
                    existingOrderIds.add(orderId);

                    // Persist to cache in background (fire-and-forget)
                    try {
                        if (window.cacheAPI && typeof window.cacheAPI.update === 'function') {
                            window.cacheAPI.update('aftersales_handover', newRecord.id, newRecord);
                        }
                        if (window.syncAPI && typeof window.syncAPI.queue === 'function') {
                            window.syncAPI.queue('aftersales_handover', newRecord.id, 'create', newRecord);
                        }
                    } catch (cacheErr) {
                        console.warn('[Aftersales] Cache write failed for:', orderId, cacheErr);
                    }
                }
            }

            _aftersalesRecords = records;
            _aftersalesLoaded = true;

            renderAftersalesList();
            updateAftersalesStats();
        } catch (e) {
            console.error('Aftersales Load Error:', e);
            body.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; padding:60px 0; color:#ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size:24px; margin-right:12px;"></i>
                <span style="font-size:15px; font-weight:600;">Failed to load records: ${e.message}</span>
            </div>`;
        }
    };

    // ── Render the list ──
    function renderAftersalesList(filterOverride) {
        const body = document.getElementById('aftersales-list-body');
        if (!body) return;

        const filterEl = document.getElementById('aftersales-filter');
        const searchEl = document.getElementById('aftersales-search');
        const companyFilterEl = document.getElementById('aftersales-company-filter');
        const statusFilter = filterOverride || (filterEl ? filterEl.value : 'Pending');
        const searchTerm = searchEl ? searchEl.value.toLowerCase().trim() : '';
        const companyFilter = companyFilterEl ? companyFilterEl.value : 'All';

        // Populate company dropdown dynamically
        if (companyFilterEl) {
            const currentVal = companyFilterEl.value;
            const companies = [...new Set(_aftersalesRecords.map(r => r.company).filter(Boolean))].sort();
            const optionsHtml = '<option value="All">All Companies</option>' + companies.map(c => 
                `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`
            ).join('');
            if (companyFilterEl.innerHTML !== optionsHtml) {
                companyFilterEl.innerHTML = optionsHtml;
            }
        }

        let filtered = _aftersalesRecords;

        // Filter by status
        if (statusFilter !== 'All') {
            filtered = filtered.filter(r => (r.status || 'Pending') === statusFilter);
        }

        // Filter by company
        if (companyFilter !== 'All') {
            filtered = filtered.filter(r => (r.company || '') === companyFilter);
        }

        // Filter by search
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const hay = [r.company, r.equipment_model, r.chassis_number, r.engine_number, r.oem, r.contact_person, r.order_id].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(searchTerm);
            });
        }

        if (filtered.length === 0) {
            const emptyIcon = statusFilter === 'Completed' ? 'fa-check-circle' : 'fa-clipboard-list';
            const emptyMsg = statusFilter === 'Completed'
                ? 'No completed aftersales records found.'
                : searchTerm ? 'No matching records found.' : 'No machines pending aftersales documentation.';
            body.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; color:#94a3b8;">
                <i class="fas ${emptyIcon}" style="font-size:48px; margin-bottom:16px; opacity:0.4;"></i>
                <span style="font-size:16px; font-weight:700;">${emptyMsg}</span>
                <span style="font-size:13px; font-weight:500; margin-top:4px;">When an order is marked "Handed Over", it will appear here for aftersales processing.</span>
            </div>`;
            return;
        }

        // Sort: newest first
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;

        filtered.forEach(rec => {
            const isPending = (rec.status || 'Pending') === 'Pending';
            const statusColor = isPending ? '#f59e0b' : '#10b981';
            const statusBg = isPending ? '#fef3c7' : '#d1fae5';
            const statusLabel = isPending ? 'PENDING' : 'COMPLETED';
            const dateStr = rec.handover_date ? new Date(rec.handover_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const saleDate = rec.date_of_sale ? new Date(rec.date_of_sale).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

            html += `
            <div onclick="window.openAftersalesForm('${rec.id}')" data-as-sn="${(rec.chassis_number||'').toLowerCase()}" style="display:flex; align-items:center; padding:16px 20px; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:all 0.2s; background:#fff; gap:16px;"
                 onmouseover="this.style.borderColor='${statusColor}'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)';"
                 onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';">
                <!-- OEM Badge -->
                <div style="width:48px; height:48px; border-radius:10px; background:linear-gradient(135deg, #0f172a, #1e293b); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <span style="color:white; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.05em;">${(rec.oem || 'N/A').substring(0, 4)}</span>
                </div>
                <!-- Main Info -->
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span style="font-size:15px; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${rec.equipment_model || 'Unknown Model'}</span>
                        <span style="font-size:10px; font-weight:700; color:${statusColor}; background:${statusBg}; padding:2px 8px; border-radius:20px; letter-spacing:0.05em;">${statusLabel}</span>
                    </div>
                    <div style="display:flex; gap:16px; flex-wrap:wrap;">
                        <span style="font-size:12px; font-weight:600; color:#64748b;"><i class="fas fa-building" style="width:14px; color:#94a3b8;"></i> ${rec.company || 'N/A'}</span>
                        <span style="font-size:12px; font-weight:600; color:#64748b;"><i class="fas fa-barcode" style="width:14px; color:#94a3b8;"></i> ${rec.chassis_number || 'No Chassis'}</span>
                        ${saleDate ? `<span style="font-size:12px; font-weight:600; color:#64748b;"><i class="fas fa-calendar" style="width:14px; color:#94a3b8;"></i> ${saleDate}</span>` : ''}
                    </div>
                </div>
                <!-- Fleetrack Status Badge -->
                <div id="as-ft-${(rec.chassis_number||rec.id||'').replace(/[^a-zA-Z0-9]/g,'-')}" style="flex-shrink:0;">
                    <span style="font-size:10px; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:3px 8px; border-radius:20px;">
                        <i class="fas fa-circle-notch fa-spin" style="font-size:9px;"></i> FT
                    </span>
                </div>
                <!-- Right Side -->
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                    <span style="font-size:11px; font-weight:700; color:#94a3b8;">Handover: ${dateStr}</span>
                    <span style="font-size:11px; font-weight:600; color:#cbd5e1;">${rec.order_id || ''}</span>
                </div>
                <!-- Arrow -->
                <i class="fas fa-chevron-right" style="color:#cbd5e1; font-size:14px; flex-shrink:0;"></i>
            </div>`;
        });

        html += `</div>`;
        body.innerHTML = html;
        // Load FT badges in background after render
        setTimeout(() => window.refreshAftersalesFtBadges && window.refreshAftersalesFtBadges(), 200);
    }

    // ── Update stat badges ──
    function updateAftersalesStats() {
        const pending = _aftersalesRecords.filter(r => (r.status || 'Pending') === 'Pending').length;
        const completed = _aftersalesRecords.filter(r => r.status === 'Completed').length;

        const pendEl = document.getElementById('aftersales-stat-pending');
        const compEl = document.getElementById('aftersales-stat-completed');
        if (pendEl) pendEl.querySelector('span').textContent = `${pending} Pending`;
        if (compEl) compEl.querySelector('span').textContent = `${completed} Completed`;
    }

    // ── Open form for a record ──
    // ── Open form for NEW manual record ──
    window.openNewAftersalesForm = function() {
        const overlay = document.getElementById('aftersales-form-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Clear all fields
        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        const newId = 'AS-MANUAL-' + Date.now();
        val('as-record-id', newId);
        val('as-order-id', 'MANUAL');
        val('as-company', '');
        val('as-contact-person', '');
        val('as-cell', '');
        val('as-email', '');
        val('as-email2', '');
        val('as-address', '');
        val('as-sale-date', '');
        val('as-oem', '');
        val('as-model', '');
        val('as-location', '');
        val('as-chassis', '');
        val('as-engine', '');
        val('as-warranty-start', '');
        val('as-warranty-end', '');
        val('as-warranty-applicable', '');
        val('as-service-plan', '');
        
        // New fields
        val('as-transmission-type', '');
        val('as-axle-type', '');
        val('as-pop-register', 'No');
        val('as-photos-plate', 'No');
        val('as-photos-machine', 'No');
        val('as-epr-update', 'No');
        val('as-warranty-cert', 'No');
        val('as-service-checklist', 'No');
        val('as-machine-status', 'No');
        val('as-invoice-copy', 'No');
        val('as-client-satisfaction', 'No');
        val('as-chk-obs-upload', 'No');
        val('as-chk-epr', 'No');
        val('as-chk-sts', 'No');
        val('as-chk-sg', 'No');
        
        val('as-srd-rm', '');
        val('as-sig-comm', '');
        val('as-sig-sales', '');
        val('as-sig-sts-scc', '');
        val('as-sig-support', '');
        val('as-sig-srd-rm', '');
        val('as-sig-admin', '');

        val('as-training-done', 'No');
        val('as-training-date', '');
        val('as-training-operator', '');
        val('as-notes', '');

        // Update title
        const title = document.getElementById('aftersales-form-title');
        if (title) title.textContent = 'Aftersales: New Manual Handover';
    };

    window.openAftersalesForm = function(recordId) {
        const rec = _aftersalesRecords.find(r => r.id === recordId);
        if (!rec) { alert('Record not found'); return; }

        const overlay = document.getElementById('aftersales-form-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Populate fields
        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        val('as-record-id', rec.id);
        val('as-order-id', rec.order_id);
        val('as-company', rec.company);
        val('as-contact-person', rec.contact_person);
        val('as-cell', rec.cell_number);
        val('as-email', rec.email_address);
        val('as-email2', rec.additional_email);
        val('as-address', rec.physical_address);
        val('as-sale-date', rec.date_of_sale);
        val('as-oem', rec.oem);
        val('as-model', rec.equipment_model);
          val('as-transmission', rec.transmission_type);
          val('as-axle', rec.axle_type);
          val('as-chk-pop', rec.pop_register || 'No');
          val('as-chk-machine-photo', rec.photos_machine_plate || 'No');
          val('as-chk-engine-photo', rec.photos_engine_plate || 'No');
          val('as-chk-obs-upload', rec.obs_upload || 'No');
          val('as-chk-epr', rec.epr_update || 'No');
          val('as-chk-sts', rec.sts_update || 'No');
          val('as-chk-sg', rec.sg_in_place || 'No');
          val('as-srd-rm', rec.srd_rm || '');
          val('as-sig-comm', rec.sig_comm || '');
          val('as-sig-sales', rec.sig_sales || '');
          val('as-sig-sts-scc', rec.sig_sts_scc || '');
          val('as-sig-support', rec.sig_support || '');
          val('as-sig-srd-rm', rec.sig_srd_rm || '');
          val('as-sig-admin', rec.sig_admin || '');
        val('as-location', rec.location);
        val('as-chassis', rec.chassis_number);
        val('as-engine', rec.engine_number);
        val('as-warranty-start', rec.warranty_start_date);
        val('as-warranty-end', rec.warranty_end_date);
        val('as-warranty-applicable', rec.warranty_applicable);
        val('as-service-plan', rec.service_plan);
        val('as-training-done', rec.training_done || 'No');
        val('as-training-date', rec.training_date);
        val('as-training-operator', rec.training_operator);
        val('as-notes', rec.notes);

        // Update title
        const title = document.getElementById('aftersales-form-title');
        if (title) title.textContent = `Aftersales: ${rec.equipment_model || rec.order_id || 'Record'}`;
    };

    // ── Close form ──
    window.closeAftersalesForm = function() {
        const overlay = document.getElementById('aftersales-form-overlay');
        if (overlay) overlay.classList.add('hidden');
    };

    // ── Gather form data ──
    function gatherFormData() {
        const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        return {
            id: get('as-record-id'),
            order_id: get('as-order-id'),
            company: get('as-company'),
            contact_person: get('as-contact-person'),
            cell_number: get('as-cell'),
            email_address: get('as-email'),
            additional_email: get('as-email2'),
            physical_address: get('as-address'),
            date_of_sale: get('as-sale-date') || null,
            oem: get('as-oem'),
            equipment_model: get('as-model'),
            transmission_type: get('as-transmission'),
            axle_type: get('as-axle'),
            pop_register: get('as-chk-pop'),
            photos_machine_plate: get('as-chk-machine-photo'),
            photos_engine_plate: get('as-chk-engine-photo'),
            obs_upload: get('as-chk-obs-upload'),
            epr_update: get('as-chk-epr'),
            sts_update: get('as-chk-sts'),
            sg_in_place: get('as-chk-sg'),
            srd_rm: get('as-srd-rm'),
            sig_comm: get('as-sig-comm'),
            sig_sales: get('as-sig-sales'),
            sig_sts_scc: get('as-sig-sts-scc'),
            sig_support: get('as-sig-support'),
            sig_srd_rm: get('as-sig-srd-rm'),
            sig_admin: get('as-sig-admin'),
            location: get('as-location'),
            chassis_number: get('as-chassis'),
            engine_number: get('as-engine'),
            warranty_start_date: get('as-warranty-start') || null,
            warranty_end_date: get('as-warranty-end') || null,
            warranty_applicable: get('as-warranty-applicable'),
            service_plan: get('as-service-plan'),
            training_done: get('as-training-done'),
            training_date: get('as-training-date') || null,
            training_operator: get('as-training-operator'),
            notes: get('as-notes'),
            updated_at: new Date().toISOString()
        };
    }

    // ── Save form (keep as Pending) ──
    window.saveAftersalesForm = async function() {
        const data = gatherFormData();
        if (!data.id) { alert('No record selected.'); return; }

        try {
            data.status = 'Pending';
            if (window.cacheAPI && typeof window.cacheAPI.update === 'function') {
                await window.cacheAPI.update('aftersales_handover', data.id, data);
            }
            if (window.syncAPI && typeof window.syncAPI.queue === 'function') {
                await window.syncAPI.queue('aftersales_handover', data.id, 'update', data);
            }

            // Update local state
            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };

            window.closeAftersalesForm();
            renderAftersalesList();
            updateAftersalesStats();
            if (window.omnisLog) window.omnisLog('Aftersales record saved.', 'success');
        } catch (e) {
            console.error('Save Aftersales Error:', e);
            alert('Failed to save: ' + e.message);
        }
    };

    // ── Complete form ──
    // ── Send Email Update ──
    // ── Print Form Logic ──
    window.printAftersalesForm = function() {
        const data = gatherFormData();
        
        let logoSrc = 'assets/Omnis-logo.png';
        if (data.company === 'Machinery Exchange') {
            logoSrc = 'assets/me_logo.png';
        } else if (data.company === 'Sinopower') {
            logoSrc = 'assets/sinopower_logo.png';
        }

        const printWindow = window.open('', '_blank');
        const getCheck = (v) => v === 'Yes' ? 'X' : '';

        // Exact replication of the paper layout
        printWindow.document.write(`
            <html>
            <head>
                <title>Aftersales Handover Form</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; line-height: 1.6; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .logo { height: 80px; }
                    .form-title { font-size: 16px; font-weight: bold; margin-top: 30px; margin-right: 50px; }
                    
                    .row { display: flex; margin-bottom: 15px; align-items: flex-end; }
                    .label { min-width: 150px; font-size: 14px; font-weight: bold; }
                    .value-line { flex: 1; border-bottom: 1px dotted #000; font-size: 15px; font-weight: normal; padding-left: 10px; font-family: 'Courier New', Courier, monospace; }
                    
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    
                    .checklist-section { margin-top: 20px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .check-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .check-label { font-size: 14px; font-weight: bold; }
                    .check-box { width: 40px; height: 20px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: monospace; font-size:16px; }
                    
                    .sig-section { display: flex; justify-content: space-between; margin-top: 40px; flex-wrap:wrap; gap: 20px; }
                    .sig-block { text-align: center; }
                    .sig-box { width: 120px; height: 30px; border: 2px solid #000; border-radius: 8px; margin-top: 5px; display: flex; align-items: center; justify-content: center; font-weight:bold; font-family: monospace;}
                    .sig-label { font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="\${logoSrc}" class="logo" onerror="this.src='assets/Omnis-logo.png'" />
                    <div class="form-title">After Sales Handover Form</div>
                    <div style="font-size:18px; font-weight:bold; font-family: 'Courier New', Courier, monospace; margin-top:30px;">\${data.oem || ''}</div>
                </div>

                <div class="grid-2" style="margin-bottom:15px;">
                    <div class="row"><div class="label">Date of Sale</div><div class="value-line">\${data.date_of_sale || ''}</div></div>
                    <div class="row"><div class="label">OEM</div><div class="value-line">\${data.oem || ''}</div></div>
                </div>

                <div class="row"><div class="label">Equipment Model</div><div class="value-line">\${data.equipment_model || ''}</div></div>
                <div class="row"><div class="label">Engine Number</div><div class="value-line">\${data.engine_number || ''}</div></div>
                <div class="row"><div class="label">Chasis Number</div><div class="value-line">\${data.chassis_number || ''}</div></div>
                <div class="row"><div class="label">Transmission</div><div class="value-line">\${data.transmission_type || ''}</div></div>
                <div class="row"><div class="label">Axle Type</div><div class="value-line">\${data.axle_type || ''}</div></div>

                <div class="checklist-section">
                    <div>
                        <div class="row" style="margin-bottom:10px;"><div class="label" style="min-width:auto;">Loaded on Pop Register</div></div>
                        <div class="check-row"><div class="check-label">Machine Data Plate Photo</div><div class="check-box">\${getCheck(data.photos_machine_plate)}</div></div>
                        <div class="check-row"><div class="check-label">Engine Data Plate Photo</div><div class="check-box">\${getCheck(data.photos_engine_plate)}</div></div>
                        <div class="check-row"><div class="check-label">Upload to OEM/SHANTUI/OBS System</div><div class="check-box">\${getCheck(data.obs_upload)}</div></div>
                    </div>
                    <div>
                        <div class="row" style="margin-bottom:10px;"><div class="label" style="min-width:auto;">&nbsp;</div></div>
                        <div class="check-row"><div class="check-label">EPR Update</div><div class="check-box">\${getCheck(data.epr_update)}</div></div>
                        <div class="check-row"><div class="check-label">STS Update</div><div class="check-box">\${getCheck(data.sts_update)}</div></div>
                        <div class="check-row"><div class="check-label">S.G In Place</div><div class="check-box">\${getCheck(data.sg_in_place)}</div></div>
                    </div>
                </div>

                <div class="row"><div class="label">Notes / Special Terms</div><div class="value-line">\${data.notes || ''}</div></div>
                
                <div class="row"><div class="label">Warranty Applicable</div><div class="value-line">\${data.warranty_applicable || ''}</div></div>
                
                <div class="grid-2" style="margin-bottom:15px;">
                    <div class="row"><div class="label">Warranty Start</div><div class="value-line">\${data.warranty_start_date || ''}</div></div>
                    <div class="row"><div class="label">End</div><div class="value-line">\${data.warranty_end_date || ''}</div></div>
                </div>

                <div class="row"><div class="label">Company</div><div class="value-line">\${data.company || ''}</div></div>
                <div class="row"><div class="label">Contact Person & Cell</div><div class="value-line">\${data.contact_person || ''} \${data.cell_number ? '- ' + data.cell_number : ''}</div></div>
                <div class="row"><div class="label">Email Addresses</div><div class="value-line">\${data.email_address || ''}</div></div>
                <div class="row"><div class="label">Email Addresses</div><div class="value-line">\${data.additional_email || ''}</div></div>
                <div class="row"><div class="label">Machine location</div><div class="value-line">\${data.location || ''}</div></div>
                <div class="row"><div class="label">Physical Address</div><div class="value-line">\${data.address || ''}</div></div>
                <div class="row"><div class="label">SRD Relationship Manager</div><div class="value-line">\${data.srd_rm || ''}</div></div>

                <div class="sig-section">
                    <div class="sig-block"><div class="sig-label">Comm Manager</div><div class="sig-box">\${data.sig_comm || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Sales manager</div><div class="sig-box">\${data.sig_sales || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">STS- SCC</div><div class="sig-box">\${data.sig_sts_scc || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Customer support</div><div class="sig-box">\${data.sig_support || ''}</div></div>
                </div>
                <div class="sig-section" style="justify-content: flex-start; margin-top:20px; gap:40px;">
                    <div class="sig-block"><div class="sig-label">SRD RM</div><div class="sig-box">\${data.sig_srd_rm || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Sales Admin</div><div class="sig-box">\${data.sig_admin || ''}</div></div>
                </div>

            
  
</body>


            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    window.sendAftersalesEmail = async function() {
        const data = gatherFormData();
        if (!data.email_address) {
            alert('Please enter an Email Address for the customer first.');
            return;
        }

        const btn = document.getElementById('as-email-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = `<span>&#9203;</span> Sending...`; }

        try {
            const subject = `Aftersales Handover - ${data.equipment_model || 'Equipment'}`;
            
            // Internal CC logic from Settings
            const companyKey = (data.company || '').toLowerCase().includes('sino') ? 'spz' : 'mxg';
            let internalCcList = [];
            try {
                const savedSettings = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                const compData = savedSettings[companyKey] || {};
                // handle legacy array format or new object format
                if (Array.isArray(compData)) {
                    internalCcList = compData;
                } else if (compData.cc && Array.isArray(compData.cc)) {
                    internalCcList = compData.cc;
                }
            } catch(e) {}

            const email2 = document.getElementById('as-email2')?.value;
            if (email2) {
                internalCcList.unshift(email2);
            }
            const ccListStr = internalCcList.join(',');

            // Build HTML Body
            const customerName = data.contact_person || 'Gentleman';
            const brand = companyKey === 'spz' ? 'Sinopower' : 'Machinery Exchange';
            const colour = companyKey === 'spz' ? '#7b1515' : '#c92222';
            const logo = companyKey === 'spz' 
                ? 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png' 
                : 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';

            const currentDate = new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'});

            const emailHtml = `
            <!DOCTYPE html><html><head><meta charset="utf-8"></head>
            <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
            <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
                <table style="width:100%;border-collapse:collapse;background:${colour};" cellpadding="0" cellspacing="0"><tr>
                    <td style="padding:24px 32px;vertical-align:middle;width:45%;">
                    <img src="${logo}" alt="${brand}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </td>
                    <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
                    <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${brand}</div>
                    <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Aftersales Handover Report</div>
                    <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: ${currentDate}</div>
                    </td>
                </tr></table>

                <div style="padding:32px 32px 16px;">
                    <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
                        Dear <strong>${customerName}</strong>,<br><br>
                        Thank you for your valued purchase! Your machine has been added to our Fleetrack Machine Management System. 
                        <strong>@MXG | Fleetrack (Bruce)</strong> and the team will be your point of contact for any aftersales queries and service requirements. 
                        A Customer Support Group (CSG) will be created where you'll be an admin, allowing you to easily add your employees to report issues or request services.
                    </p>
                </div>
                
                <div style="padding:16px 32px 36px;overflow-x:auto;">
                    <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
                        <thead>
                            <tr style="background:${colour};">
                                <th colspan="2" style="padding:16px 20px;text-align:left;color:white;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid rgba(0,0,0,0.1);">Machine Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;width:40%;background:#f8fafc;">Machine Model</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.equipment_model || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">SN (Chassis Number)</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.chassis_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">OEM</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.oem || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Engine Number</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.engine_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Applicable</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.warranty_applicable || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Start</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.warranty_start_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty End</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${data.warranty_end_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;font-weight:bold;background:#f8fafc;">Service Plan</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;">${data.service_plan || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
                    Please feel free to contact us with any questions or queries.<br>
                    Kind regards, <strong>${data.sales_rep || 'Aftersales Team'}</strong><br><br>
                    This is an automated update from ${brand}. Please do not reply to this email. &copy; ${brand} &mdash; Omnis Order Management System
                </div>
            </div>
  
</body>
</html>
            `;

            if (!window.electron || !window.electron.invoke) throw new Error('System email service unavailable');
            
            const res = await window.electron.invoke('email:send', {
                to: data.email_address, 
                cc: ccListStr, 
                subject: subject, 
                html: emailHtml,
                relatedDoc: data.order_id, 
                relatedType: 'aftersales'
            });
            
            if (res && res.ok) {
                if (btn) btn.innerHTML = `<span>&#9989;</span> Sent!`;
                if (window.omnisLog) window.omnisLog('Aftersales email queued to ' + data.email_address, 'success');
            } else {
                throw new Error(res?.error || 'Failed to queue email.');
            }
        } catch(err) {
            console.error('Email error:', err);
            alert('Failed to send email: ' + err.message);
            if (btn) btn.innerHTML = `<span>&#10060;</span> Error`;
        }

        setTimeout(() => { 
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<i class="fas fa-paper-plane"></i> Email Update`; } 
        }, 3000);
    };

    window.completeAftersalesForm = async function() {
        if (!confirm('Mark this aftersales record as COMPLETED? This indicates all documentation is finalized.')) return;

        const data = gatherFormData();
        if (!data.id) { alert('No record selected.'); return; }

        try {
            data.status = 'Completed';
            if (window.cacheAPI && typeof window.cacheAPI.update === 'function') {
                await window.cacheAPI.update('aftersales_handover', data.id, data);
            }
            if (window.syncAPI && typeof window.syncAPI.queue === 'function') {
                await window.syncAPI.queue('aftersales_handover', data.id, 'update', data);
            }

            // Update local state
            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };

            window.closeAftersalesForm();
            renderAftersalesList();
            updateAftersalesStats();
            if (window.omnisLog) window.omnisLog('Aftersales record COMPLETED.', 'success');
        } catch (e) {
            console.error('Complete Aftersales Error:', e);
            alert('Failed to complete: ' + e.message);
        }
    };

    // ── Create a new aftersales record when an order is handed over ──
    window.createAftersalesFromHandover = async function(orderData) {
        try {
            const newRecord = {
                id: 'AS-' + Date.now(),
                order_id: orderData.order_name || orderData.name || '',
                company: orderData.customer_id || orderData.company || '',
                contact_person: orderData.contact_person || '',
                cell_number: orderData.cell_number || '',
                email_address: orderData.email || '',
                physical_address: orderData.address || orderData.location || '',
                date_of_sale: orderData.order_date || new Date().toISOString().split('T')[0],
                equipment_model: orderData.model || orderData.item_code || '',
                chassis_number: orderData.serial_no || orderData.chassis_number || '',
                engine_number: orderData.engine_number || '',
                oem: orderData.brand || orderData.oem || '',
                location: orderData.location || '',
                warranty_start_date: orderData.handover_date || new Date().toISOString().split('T')[0],
                handover_salesperson: orderData.salesperson || '',
                handover_date: orderData.handover_date || new Date().toISOString().split('T')[0],
                status: 'Pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (window.cacheAPI && typeof window.cacheAPI.update === 'function') {
                await window.cacheAPI.update('aftersales_handover', newRecord.id, newRecord);
            }
            if (window.syncAPI && typeof window.syncAPI.queue === 'function') {
                await window.syncAPI.queue('aftersales_handover', newRecord.id, 'create', newRecord);
            }

            // Add to local state if loaded
            _aftersalesRecords.push(newRecord);

            console.log('[Aftersales] Created record for order:', newRecord.order_id);
            return newRecord;
        } catch (e) {
            console.error('[Aftersales] Create Error:', e);
        }
    };

    // ── Wire up search and filter ──
    document.addEventListener('DOMContentLoaded', function() {
        const searchEl = document.getElementById('aftersales-search');
        const filterEl = document.getElementById('aftersales-filter');
        const companyFilterEl = document.getElementById('aftersales-company-filter');

        if (searchEl) {
            let searchTimer;
            searchEl.addEventListener('input', function() {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => renderAftersalesList(), 300);
            });
        }

        if (filterEl) {
            filterEl.addEventListener('change', function() {
                renderAftersalesList();
            });
        }

        if (companyFilterEl) {
            companyFilterEl.addEventListener('change', function() {
                renderAftersalesList();
            });
        }
    });

    // ── Auto-load when switching to Aftersales view ──
    // Always reload to pick up newly-loaded Order Tracking data
    const _origShowView = window.showView;
    if (typeof _origShowView === 'function') {
        window.showView = function(viewId) {
            _origShowView(viewId);
            if (viewId === 'view-aftersales') {
                _aftersalesLoaded = false; // Force re-scan of OT data
                window.loadAftersalesRecords();
            }
        };
    }

    // Also hook into nav-item clicks (belt-and-suspenders)
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('[data-view="view-aftersales"]');
        if (navItem) {
            setTimeout(() => {
                _aftersalesLoaded = false; // Force re-scan
                window.loadAftersalesRecords();
            }, 100);
        }
    });

})();
