
(function() {
    'use strict';
    var _records = [];

    /* ── Load from shared Electron cache (orders table, status = handed over) ── */
    window.ftAsLoad = async function() {
        var body = document.getElementById('ftas-body');
        if (!body) return;
        body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;"><span style="font-size:24px;margin-right:12px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Loading aftersales records...</span></div>';
        try {
            var recs = [];

            if (window.electron && window.electron.ipcRenderer) {
                /* ── Step 1: Read orders cache (proven: 67 records with handed-over status) ── */
                var ordRes = await window.electron.ipcRenderer.invoke('cache:getAll', 'orders');
                var orders = [];
                if (ordRes && ordRes.ok && ordRes.data) {
                    orders = Array.isArray(ordRes.data) ? ordRes.data : Object.values(ordRes.data);
                } else if (Array.isArray(ordRes)) {
                    orders = ordRes;
                }
                console.log('[FT After-Sales] orders cache count:', orders.length);
                if (orders.length > 0) {
                    console.log('[FT After-Sales] orders[0] keys:', Object.keys(orders[0]));
                    console.log('[FT After-Sales] orders[0]:', JSON.stringify(orders[0]).substring(0, 400));
                }

                /* ── Step 2: Build machine lookup from window.olOrdersData (Salestrack GSM — has r.machine) ── */
                var machineLookup = {};
                var gsm = window.olOrdersData || [];
                gsm.forEach(function(o) {
                    var key = (o.report_id || o.name || '').toLowerCase();
                    if (key) machineLookup[key] = o;
                });
                console.log('[FT After-Sales] olOrdersData count:', gsm.length);

                /* ── Step 3: Filter orders for handed-over status ── */
                var handedOrders = orders.filter(function(o) {
                    var s = (o.status || o.phase || '').toLowerCase();
                    return s.includes('handed') || s.includes('handover') || s.includes('delivered') || s.includes('complete');
                });
                console.log('[FT After-Sales] Handed-over orders:', handedOrders.length);

                /* ── Step 4: Map records, enriching with GSM machine data where available ── */
                recs = handedOrders.map(function(o) {
                    /* Try to find enriched machine data from Salestrack's in-memory GSM list */
                    var key = (o.name || o.frappe_id || o.report_id || '').toLowerCase();
                    var gsm_rec = machineLookup[key] || {};

                    return {
                        id: 'AS-' + (o.name || o.frappe_id || o.report_id || Math.random().toString(36).substr(2,8)),
                        order_id: o.name || o.frappe_id || o.report_id || '',
                        company: o.customer || gsm_rec.customer || o.customer_name || '',
                        /* machine field confirmed from orders_logic.js renderOrdersList */
                        equipment_model: gsm_rec.machine || o.machine || o.model || o.item || '',
                        qty: gsm_rec.qty || o.qty || '',
                        chassis_number: o.chassis_number || o.serial_no || '',
                        oem: gsm_rec.oem || o.brand || o.oem || '',
                        date_of_sale: o.order_date || o.date || '',
                        handover_date: o.handover_date || o.revised_handover || o.target_handover || '',
                        handover_salesperson: o.salesperson || '',
                        status: 'Pending'
                    };
                });

            }

            _records = Array.isArray(recs) ? recs : [];
            console.log('[FT After-Sales] Final record count:', _records.length);
            if (_records.length > 0) console.log('[FT After-Sales] Sample:', JSON.stringify(_records[0]));

            /* Populate company filter */
            var companies = ['All'].concat([...new Set(_records.map(function(r){return r.company||'';}).filter(Boolean))].sort());
            var cf = document.getElementById('ftas-company-filter');
            if (cf) {
                var current = cf.value;
                cf.innerHTML = companies.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
                cf.value = companies.includes(current) ? current : 'All';
            }

            window.ftAsRender();
        } catch(e) {
            console.error('[FT After-Sales] Load error:', e);
            body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#ef4444;"><span style="font-size:15px;font-weight:600;">Failed to load: '+e.message+'</span></div>';
        }
    };






    /* ── Render list ── */
    window.ftAsRender = function() {
        var body = document.getElementById('ftas-body'); if (!body) return;
        var q = ((document.getElementById('ftas-search')||{}).value||'').toLowerCase().trim();
        var status = ((document.getElementById('ftas-status-filter')||{}).value||'Pending');
        var company = ((document.getElementById('ftas-company-filter')||{}).value||'All');

        var items = _records.slice();
        if (status !== 'All') items = items.filter(function(r){return (r.status||'Pending') === status;});
        if (company !== 'All') items = items.filter(function(r){return (r.company||'') === company;});
        if (q) items = items.filter(function(r){
            return [r.equipment_model,r.company,r.chassis_number,r.oem,r.handover_salesperson,r.order_id].some(function(s){return (s||'').toLowerCase().includes(q);});
        });

        /* Update stat pills */
        var pending   = _records.filter(function(r){return (r.status||'Pending')==='Pending';}).length;
        var completed = _records.filter(function(r){return r.status==='Completed';}).length;
        var ep = document.getElementById('ftas-pending-label');   if(ep) ep.textContent = pending+' Pending';
        var ec = document.getElementById('ftas-completed-label'); if(ec) ec.textContent = completed+' Completed';

        if (!items.length) {
            body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;color:#94a3b8;"><span style="font-size:40px;margin-bottom:12px;">&#10004;</span><span style="font-size:16px;font-weight:700;color:#334155;">'+(status==='Pending'?'All clear — no pending handovers!':'No records found.')+'</span></div>';

            return;
        }

        body.innerHTML = items.map(function(r) {
            var isPending = (r.status || 'Pending') === 'Pending';
            var badge = isPending
                ? '<span style="font-size:10px;font-weight:800;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">PENDING</span>'
                : '<span style="font-size:10px;font-weight:800;background:#d1fae5;color:#047857;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">COMPLETED</span>';

            /* Avatar uses customer name initials */
            var customerName = r.company || r.customer || '';
            var initials = customerName.replace(/[^A-Za-z0-9\s]/g,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() || 'N';

            /* Avatar background hashed from first letter */
            var bgPalette = ['#0f172a','#1e3a5f','#7c3aed','#064e3b','#92400e','#1a2e1a','#1e1b4b','#450a0a','#0c4a6e','#3b0764'];
            var avatarBg = bgPalette[initials.charCodeAt(0) % bgPalette.length] || '#334155';

            var model    = r.equipment_model || '';
            var chassis  = r.chassis_number  || '';
            var oem      = r.oem             || '';
            var qty      = r.qty ? ' ×' + r.qty : '';
            var dateStr  = r.date_of_sale ? new Date(r.date_of_sale).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';
            var hDateStr = r.handover_date  ? new Date(r.handover_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';

            /* Machine label — combine OEM + model */
            var machineLabel = (oem && model) ? oem + ' ' + model : (oem || model);

            /* Extra detail chips — only non-empty */
            var chips = [];
            if (chassis) chips.push('<span style="font-size:11px;color:#64748b;">&#9646; ' + chassis + '</span>');
            if (dateStr)  chips.push('<span style="font-size:11px;color:#64748b;">&#128197; ' + dateStr + '</span>');

            var safeId  = (r.id||'').toString().replace(/[^a-zA-Z0-9\-]/g,'');
            var markBtn = isPending
                ? '<button onclick="window.ftAsMarkComplete(\x27' + safeId + '\x27)" style="flex-shrink:0;padding:7px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:800;color:#047857;cursor:pointer;white-space:nowrap;">&#10003; Mark Done</button>'
                : '';

            return '<div class="ftas-row" style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #f1f5f9;gap:14px;">' +
                /* Avatar */
                '<div style="width:46px;height:46px;border-radius:12px;background:' + avatarBg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;letter-spacing:0.03em;flex-shrink:0;">' + initials + '</div>' +
                '<div style="flex:1;min-width:0;">' +
                  /* Row 1: Customer name + badge */
                  '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
                    '<span style="font-size:15px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;">' + (customerName || 'Unknown Customer') + '</span>' +
                    badge +
                  '</div>' +
                  /* Row 2: Machine model — bold subtitle, always shown if available */
                  (machineLabel
                    ? '<div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:4px;">' + machineLabel + qty + '</div>'
                    : '') +
                  /* Row 3: Extra chips */
                  (chips.length ? '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' + chips.join('') + '</div>' : '') +
                '</div>' +
                '<div style="text-align:right;flex-shrink:0;min-width:130px;">' +
                  '<div style="font-size:12px;font-weight:700;color:#3b82f6;margin-bottom:3px;">Handover: ' + hDateStr + '</div>' +
                  (r.order_id ? '<div style="font-size:10px;color:#94a3b8;font-family:monospace;">' + r.order_id + '</div>' : '') +
                '</div>' +
                markBtn +
                '</div>';
        }).join('');
    };




    /* ── Mark as completed ── */
    window.ftAsMarkComplete = async function(safeId) {
        var rec = _records.find(function(r){return (r.id||'').toString().replace(/[^a-zA-Z0-9\-]/g,'') === safeId;});
        if (!rec || !confirm('Mark "'+( rec.equipment_model||rec.id)+'" as Completed?')) return;
        rec.status = 'Completed';
        rec.updated_at = new Date().toISOString();
        try {
            if (window.electron && window.electron.ipcRenderer) {
                await window.electron.ipcRenderer.invoke('supabase:query', { table:'aftersales_handover', method:'upsert', data: rec });
            } else if (window.supabase) {
                await window.supabase.from('aftersales_handover').update({ status:'Completed', updated_at: rec.updated_at }).eq('id', rec.id);
            }
            if (window.cacheAPI && typeof window.cacheAPI.update === 'function') {
                window.cacheAPI.update('aftersales_handover', rec.id, rec);
            }
        } catch(e) { console.warn('Mark complete failed:', e); }
        window.ftAsRender();
        if (window.showToast) window.showToast('Marked as completed.', 'ok', 2500);
    };
})();
