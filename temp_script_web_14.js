
(function() {
    'use strict';
    var _records = [];

    /* ── After-Sales Hub: Load + Render + Detail Modal ── */
    (function() {
        'use strict';
        var _records = [];
        var _raw     = [];   /* full raw API objects for the modal */

        /* ── Resolve Salestrack base URL ── */
        var _stBase = 'https://salestrack.powerstar.co.zw';
        try { if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) _stBase = window.CURRENT_SYSTEM.baseUrl; } catch(e){}

        /* ── Map raw API record → display record ── */
        function _mapRec(o) {
            /* Determine aftersales status from local storage override or order status */
            var localKey = 'ftas_status_' + (o.name || '');
            var localSt  = localStorage.getItem(localKey); /* "Pending" | "Completed" */
            var status   = localSt || 'Pending';

            return {
                id:               o.name || '',
                order_id:         o.name || '',
                company:          o.customer_name || o.customer || '',
                equipment_model:  o.machine_label || o.machine || o.model || '',
                qty:              o.quantity || o.qty || '',
                chassis_number:   o.chassis_number || o.serial_no || '',
                oem:              o.oem || o.brand || '',
                date_of_sale:     o.order_date || o.date || '',
                handover_date:    o.target_handover_date || o.handover_date || '',
                salesperson:      o.salesperson || '',
                raw_status:       o.status || '',
                status:           status,
                _raw:             o
            };
        }

        /* ── Load ── */
        window.ftAsLoad = async function() {
            var body = document.getElementById('ftas-body');
            if (!body) return;
            body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;gap:12px;"><span style="font-size:24px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Loading aftersales records...</span></div>';
            try {
                var raw = [];

                /* Strategy 1 – SQLite cache (only trust if ≥10 valid order records) */
                if (window.cacheAPI) {
                    try {
                        var c = await window.cacheAPI.getAll('orders');
                        var cData = [];
                        if (c && c.ok && Array.isArray(c.data)) cData = c.data;
                        else if (Array.isArray(c)) cData = c;
                        /* Validate: record must have a real 'name' AND a customer field */
                        var validCache = cData.filter(function(o){
                            return o && o.name && !o._ft_as_batch && (o.customer_name || o.customer);
                        });
                        if (validCache.length >= 10) raw = validCache;
                    } catch(e) {}
                }

                /* Strategy 2 – Direct Salestrack API (always used if cache is small/empty) */
                if (raw.length < 10 && window.frappeAPI) {
                    body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;gap:12px;"><span style="font-size:24px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Fetching from Salestrack...</span></div>';
                    try {
                        var res = await window.frappeAPI.request({
                            url: _stBase + '/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_orders',
                            method: 'GET',
                            data: { page_length: 1000 }
                        });
                        if (res && res.ok && res.data && res.data.message) {
                            var msg = res.data.message;
                            var apiData = msg.data || (Array.isArray(msg) ? msg : []);
                            if (apiData.length > 0) raw = apiData;
                        }
                    } catch(e) { console.warn('[FTAS] API fetch failed:', e.message); }
                }

                /* Strategy 3 – group_sales cache */
                if (!raw.length && window.cacheAPI) {
                    try {
                        var gc = await window.cacheAPI.getAll('group_sales');
                        if (gc && gc.ok && Array.isArray(gc.data) && gc.data.length) raw = gc.data;
                        else if (Array.isArray(gc) && gc.length) raw = gc;
                    } catch(e) {}
                }

                _raw     = raw;
                _records = raw.map(_mapRec);

                /* Populate company filter */
                var companies = ['All'].concat([...new Set(_records.map(function(r){return r.company;}).filter(Boolean))].sort());
                var cf = document.getElementById('ftas-company-filter');
                if (cf) {
                    var prev = cf.value;
                    cf.innerHTML = companies.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
                    cf.value = companies.includes(prev) ? prev : 'All';
                }

                window.ftAsRender();

            } catch(e) {
                console.error('[FTAS] Load error:', e);
                body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#ef4444;"><span style="font-size:15px;font-weight:600;">Failed to load: ' + e.message + '</span></div>';
            }
        };

        /* ── Nav badge helper ── */
        function ftAsUpdateNavBadge(n) {
            var b = document.getElementById('ft-as-nav-badge');
            if (!b) return;
            b.style.display = n > 0 ? 'inline' : 'none';
            b.textContent   = n > 99 ? '99+' : String(n);
        }
        window.ftAsUpdateNavBadge = ftAsUpdateNavBadge;

        /* ── Populate badge on startup from local cache (no API hit) ── */
        function ftAsBadgeInit() {
            (async function() {
                try {
                    var raw = [];
                    if (window.cacheAPI) {
                        var c = await window.cacheAPI.getAll('orders');
                        var cData = (c && c.ok && Array.isArray(c.data)) ? c.data
                                  : (Array.isArray(c) ? c : []);
                        raw = cData.filter(function(o) {
                            return o && o.name && !o._ft_as_batch && (o.customer_name || o.customer);
                        });
                    }
                    if (raw.length > 0) {
                        var pending = raw.filter(function(o) {
                            var lk = 'ftas_status_' + (o.name || '');
                            var ls = localStorage.getItem(lk);
                            return !ls || ls === 'Pending';
                        }).length;
                        ftAsUpdateNavBadge(pending);
                        /* Also seed the dashboard KPI card */
                        var kc  = document.getElementById('kpi-aftersales-count');
                        var ks  = document.getElementById('kpi-aftersales-sub');
                        var kst = document.getElementById('kpi-aftersales-stripe');
                        if (kc)  kc.textContent  = pending;
                        if (ks)  ks.textContent  = pending === 1 ? '1 handover pending' : pending + ' handovers pending';
                        if (kst) kst.style.display = pending > 0 ? 'block' : 'none';
                    } else if (!window.cacheAPI) {
                        /* cacheAPI not ready yet — retry once more */
                        setTimeout(ftAsBadgeInit, 2500);
                    }
                } catch(e) { /* silent — badge is non-critical */ }
            })();
        }
        /* Delay to let Electron preload / cacheAPI initialise first */
        setTimeout(ftAsBadgeInit, 800);

        /* ── Render list ── */
        window.ftAsRender = function() {
            var body = document.getElementById('ftas-body');
            if (!body) return;
            var q       = ((document.getElementById('ftas-search')||{}).value||'').toLowerCase().trim();
            var status  = ((document.getElementById('ftas-status-filter')||{}).value||'Pending');
            var company = ((document.getElementById('ftas-company-filter')||{}).value||'All');

            var items = _records.slice();
            if (status !== 'All')    items = items.filter(function(r){return (r.status||'Pending') === status;});
            if (company !== 'All')   items = items.filter(function(r){return r.company === company;});
            if (q) items = items.filter(function(r){
                return [r.equipment_model,r.company,r.chassis_number,r.order_id,r.raw_status].some(function(s){return (s||'').toLowerCase().includes(q);});
            });

            /* Stat pills */
            var nPending   = _records.filter(function(r){return r.status==='Pending';}).length;
            var nCompleted = _records.filter(function(r){return r.status==='Completed';}).length;
            var ep = document.getElementById('ftas-pending-label');   if(ep) ep.textContent = nPending   + ' Pending';
            var ec = document.getElementById('ftas-completed-label'); if(ec) ec.textContent = nCompleted + ' Completed';
            ftAsUpdateNavBadge(nPending);
            /* Also update dashboard KPI card */
            (function(n) {
                var kc = document.getElementById('kpi-aftersales-count');
                var ks = document.getElementById('kpi-aftersales-sub');
                var kst = document.getElementById('kpi-aftersales-stripe');
                if (kc)  kc.textContent  = n;
                if (ks)  ks.textContent  = n === 1 ? '1 handover pending' : n + ' handovers pending';
                if (kst) kst.style.display = n > 0 ? 'block' : 'none';
            })(nPending);

            if (!items.length) {
                body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;color:#94a3b8;"><span style="font-size:40px;margin-bottom:12px;">&#10004;</span><span style="font-size:16px;font-weight:700;color:#334155;">' + (status==='Pending'?'All clear \u2014 no pending handovers!':'No records found.') + '</span></div>';
                return;
            }

            var bgPalette = ['#0f172a','#1e3a5f','#7c3aed','#064e3b','#92400e','#1a2e1a','#1e1b4b','#450a0a','#0c4a6e','#3b0764'];

            body.innerHTML = items.map(function(r) {
                var isPending = r.status !== 'Completed';
                var badge = isPending
                    ? '<span style="font-size:10px;font-weight:800;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">PENDING</span>'
                    : '<span style="font-size:10px;font-weight:800;background:#d1fae5;color:#047857;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">COMPLETED</span>';

                var initials = (r.company||'?').replace(/[^A-Za-z0-9\s]/g,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() || '?';
                var avatarBg = bgPalette[initials.charCodeAt(0) % bgPalette.length];

                var machineLabel = r.equipment_model || '';
                var qty          = r.qty ? ' \xd7' + r.qty : '';
                var hDateStr     = r.handover_date ? new Date(r.handover_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';
                var dateStr      = r.date_of_sale  ? new Date(r.date_of_sale).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';

                var safeId = (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_');
                var markBtn = isPending
                    ? '<button onclick="event.stopPropagation();window.ftAsMarkComplete(\''+safeId+'\')" style="flex-shrink:0;padding:7px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:800;color:#047857;cursor:pointer;white-space:nowrap;">&#10003; Mark Done</button>'
                    : '';
                var registerBtn = '<button onclick="event.stopPropagation();window.ftAsRegisterMachine(\''+safeId+'\')" style="flex-shrink:0;padding:7px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11px;font-weight:800;color:#1d4ed8;cursor:pointer;white-space:nowrap;">&#43; Fleetrack</button>';
                var actionBtns = '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end;">' + registerBtn + markBtn + '</div>';

                return '<div class="ftas-row" onclick="window.ftAsOpenModal(\''+safeId+'\')" style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #f1f5f9;gap:14px;cursor:pointer;transition:background .12s;" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                    '<div style="width:46px;height:46px;border-radius:12px;background:'+avatarBg+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0;">'+initials+'</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
                            '<span style="font-size:15px;font-weight:900;color:#0f172a;">'+(r.company||'Unknown')+'</span>' +
                            badge +
                        '</div>' +
                        (machineLabel ? '<div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:4px;">'+machineLabel+qty+'</div>' : '') +
                        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
                            (dateStr ? '<span style="font-size:11px;color:#64748b;">&#128197; '+dateStr+'</span>' : '') +
                            (r.raw_status ? '<span style="font-size:11px;color:#64748b;">'+r.raw_status+'</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:right;flex-shrink:0;min-width:130px;">' +
                        '<div style="font-size:12px;font-weight:700;color:#3b82f6;margin-bottom:3px;">Handover: '+hDateStr+'</div>' +
                        (r.order_id ? '<div style="font-size:10px;color:#94a3b8;font-family:monospace;">'+r.order_id+'</div>' : '') +
                    '</div>' +
                    actionBtns +
                '</div>';
            }).join('');
        };

        /* ── Open detail modal ── */
        window.ftAsOpenModal = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            var raw = rec._raw || {};

            /* Remove existing modal */
            var existing = document.getElementById('ftas-modal');
            if (existing) existing.remove();

            var isPending = rec.status !== 'Completed';
            var hDate  = rec.handover_date  ? new Date(rec.handover_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
            var oDate  = rec.date_of_sale   ? new Date(rec.date_of_sale).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})  : '—';
            var modDate= raw.modified ? new Date(raw.modified).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

            function field(label, value, accent) {
                if (!value) return '';
                return '<div style="padding:14px 0;border-bottom:1px solid #f1f5f9;">' +
                    '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">'+label+'</div>' +
                    '<div style="font-size:14px;font-weight:700;color:'+(accent||'#0f172a')+';">'+value+'</div>' +
                '</div>';
            }

            var safeOid = (rec.order_id||'').replace(/[^a-zA-Z0-9\-_]/g,'_');
            var modal = document.createElement('div');
            modal.id = 'ftas-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);';
            modal.innerHTML =
                '<div style="background:#fff;border-radius:20px;width:520px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.22);display:flex;flex-direction:column;">' +
                    /* Header */
                    '<div style="padding:24px 28px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:16px;">' +
                        '<div style="width:56px;height:56px;border-radius:14px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;flex-shrink:0;">' +
                            (rec.company||'?').replace(/[^A-Za-z0-9\s]/g,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() +
                        '</div>' +
                        '<div style="flex:1;">' +
                            '<div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:4px;">'+(rec.company||'Unknown Customer')+'</div>' +
                            '<div style="font-size:13px;color:#64748b;font-family:monospace;">'+(rec.order_id||'')+'</div>' +
                            '<div style="margin-top:8px;">' +
                                (isPending
                                    ? '<span style="font-size:11px;font-weight:800;background:#fef3c7;color:#92400e;padding:3px 12px;border-radius:20px;">PENDING</span>'
                                    : '<span style="font-size:11px;font-weight:800;background:#d1fae5;color:#047857;padding:3px 12px;border-radius:20px;">COMPLETED</span>') +
                                '&nbsp;<span style="font-size:11px;color:#94a3b8;margin-left:4px;">'+(rec.raw_status||'')+'</span>' +
                            '</div>' +
                        '</div>' +
                        '<button onclick="document.getElementById(\'ftas-modal\').remove()" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;padding:0;margin:-4px -4px 0 0;">&times;</button>' +
                    '</div>' +
                    /* Body fields */
                    '<div style="padding:4px 28px 20px;">' +
                        field('Machine / Model',   rec.equipment_model || (raw.machine_label || raw.machine || '')) +
                        field('Quantity',           rec.qty ? rec.qty + ' unit' + (rec.qty > 1 ? 's' : '') : '') +
                        field('Order Date',         oDate) +
                        field('Target Handover',    hDate, '#3b82f6') +
                        field('Order Status',       rec.raw_status) +
                        field('Salesperson',        rec.salesperson) +
                        field('Chassis / Serial',   rec.chassis_number) +
                        field('OEM / Brand',        rec.oem) +
                        field('Last Modified',      modDate, '#64748b') +
                    '</div>' +
                    /* Actions */
                    '<div style="padding:16px 28px 24px;border-top:1px solid #f1f5f9;display:flex;gap:10px;justify-content:flex-end;">' +
                        (isPending
                            ? '<button onclick="window.ftAsMarkComplete(\''+safeOid+'\');document.getElementById(\'ftas-modal\').remove();" style="padding:10px 22px;background:#047857;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;">&#10003; Mark as Completed</button>'
                            : '<button onclick="window.ftAsMarkPending(\''+safeOid+'\');document.getElementById(\'ftas-modal\').remove();" style="padding:10px 22px;background:#f59e0b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;">&#8635; Mark as Pending</button>') +
                        '<button onclick="document.getElementById(\'ftas-modal\').remove()" style="padding:10px 22px;background:#f1f5f9;color:#334155;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Close</button>' +
                    '</div>' +
                '</div>';

            /* Close on backdrop click */
            modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
        };

        /* ── Mark as completed ── */
        window.ftAsMarkComplete = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            rec.status = 'Completed';
            localStorage.setItem('ftas_status_' + rec.id, 'Completed');
            window.ftAsRender();
            if (window.showToast) window.showToast('Marked as completed.', 'ok', 2500);
        };

        /* ── Mark back as pending ── */
        window.ftAsMarkPending = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            rec.status = 'Pending';
            localStorage.removeItem('ftas_status_' + rec.id);
            window.ftAsRender();
            if (window.showToast) window.showToast('Moved back to pending.', 'ok', 2500);
        };

        /* ── Register machine in Fleetrack Supabase ── */
        window.ftAsRegisterMachine = function(safeId) {
            var rec = _records.find(function(r){ return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId; });
            if (!rec) return;

            /* Auto-generate a name from chassis / model */
            var yr  = new Date().getFullYear();
            var snB = (rec.chassis_number||'').replace(/[^A-Za-z0-9]/g,'').substring(0,10).toUpperCase();
            var autoName = snB ? 'FT-'+yr+'-'+snB : 'FT-'+yr+'-'+Date.now().toString(36).toUpperCase();

            /* Pre-fill form */
            var f = function(id, val) { var el=document.getElementById(id); if(el) el.value = val||''; };
            f('ftas-reg-name',         autoName);
            f('ftas-reg-model',        rec.equipment_model);
            f('ftas-reg-oem',          rec.oem);
            f('ftas-reg-customer',     rec.company);
            f('ftas-reg-sn',           rec.chassis_number);
            f('ftas-reg-chassis',      rec.chassis_number);
            f('ftas-reg-fleet',        '');
            f('ftas-reg-type',         '');
            f('ftas-reg-handover',     rec.handover_date ? rec.handover_date.substring(0,10) : '');
            f('ftas-reg-epr',          rec.date_of_sale  ? rec.date_of_sale.substring(0,10)  : '');
            f('ftas-reg-notes',        'Registered via Aftersales Hub. Order: '+(rec.order_id||''));
            var chk = document.getElementById('ftas-reg-managed'); if(chk) chk.checked = true;
            var err = document.getElementById('ftas-reg-error');   if(err) err.style.display='none';

            /* Store safeId on modal for submit */
            var m = document.getElementById('ftas-register-modal');
            if(m) { m.dataset.safeId = safeId; m.style.display='flex'; }
        };

        window.ftAsCloseRegister = function() {
            var m = document.getElementById('ftas-register-modal');
            if(m) m.style.display='none';
        };

        window.ftAsRegisterSubmit = async function() {
            var g = function(id) { var el=document.getElementById(id); return el ? el.value.trim() : ''; };
            var name     = g('ftas-reg-name');
            var model    = g('ftas-reg-model');
            var customer = g('ftas-reg-customer');
            var sn       = g('ftas-reg-sn');
            var err      = document.getElementById('ftas-reg-error');
            var btn      = document.getElementById('ftas-reg-submit-btn');

            if (!name)  { if(err){err.textContent='Machine ID is required.'; err.style.display='block';} return; }
            if (!model) { if(err){err.textContent='Model is required.'; err.style.display='block';} return; }
            if(err) err.style.display='none';

            var payload = {
                name:           name,
                model:          g('ftas-reg-model'),
                oem:            g('ftas-reg-oem'),
                customer:       customer,
                sn:             sn,
                chassis_number: g('ftas-reg-chassis'),
                fleet_no:       g('ftas-reg-fleet'),
                type:           g('ftas-reg-type'),
                handover_date:  g('ftas-reg-handover') || null,
                epr_entry_date: g('ftas-reg-epr')      || null,
                notes:          g('ftas-reg-notes'),
                fleetrack_managed: document.getElementById('ftas-reg-managed') ? document.getElementById('ftas-reg-managed').checked : true,
                created_at:     new Date().toISOString(),
                updated_at:     new Date().toISOString()
            };

            if(btn){ btn.textContent='Registering…'; btn.disabled=true; }

            try {
                if (!window.supabase) throw new Error('Supabase client not available — ensure the app is connected.');
                var result = await window.supabase.from('ft_machine').upsert([payload]);
                if (result.error) throw new Error(result.error.message);

                window.ftAsCloseRegister();
                if (window.showToast) window.showToast('\u2714 Machine registered in Fleetrack: '+name, 'ok', 4000);

                /* Optionally mark the record as done */
                var m = document.getElementById('ftas-register-modal');
                var sid = m ? m.dataset.safeId : null;
                if (sid && confirm('Machine registered! Mark this handover as Complete?')) {
                    window.ftAsMarkComplete(sid);
                }
            } catch(e) {
                if(err){ err.textContent='Failed: '+e.message; err.style.display='block'; }
            } finally {
                if(btn){ btn.textContent='Register Machine'; btn.disabled=false; }
            }
        };

        /* Close modal on backdrop click */
        (function(){
            var m = document.getElementById('ftas-register-modal');
            if(m) m.addEventListener('click', function(e){ if(e.target===m) window.ftAsCloseRegister(); });
        })();

    })();

})();

//  USER MANAGEMENT MODULE — Admin only
// ══════════════════════════════════════════════════════════
(function() {

  const SUPER_ADMIN_EMAIL = 'takunda@industrial-exchange.group';
  let UM_USERS = [];

  function isSuperAdmin(u) { return u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase(); }
  function isAdmin(u) { return isSuperAdmin(u) || u.app_metadata?.role === 'admin'; }

  // ── Show nav item for admin/super-admin ──────────────────
  function initAdminFeatures(email) {
    if (!email) return;
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const ddItem = document.getElementById('dd-user-mgmt-item');
      if (ddItem) ddItem.style.display = '';
    }
  }
  window.initAdminFeatures = initAdminFeatures;

  // ── Show nav item — robust 3-layer detection ─────────────
  function revealUserMgmtNav() {
    var el = document.getElementById('dd-user-mgmt-item');
    if (el) el.style.display = '';
  }

  function getEmailFromJwt(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var payload = JSON.parse(atob(b64));
      return payload.email || null;
    } catch(e) { return null; }
  }

  function checkCurrentUserIsAdmin(email) {
    if (!email) return false;
    return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  }

  // Run immediately (scripts at bottom of body, DOM already parsed)
  (function checkAdminOnLoad() {
    console.log('[UserMgmt] Checking admin status...');
    console.log('[UserMgmt] localStorage keys:', Object.keys(localStorage));

    // Layer 1: ft_user_email in localStorage
    var email1 = localStorage.getItem('ft_user_email') || '';
    console.log('[UserMgmt] ft_user_email:', email1);
    if (email1 && checkCurrentUserIsAdmin(email1)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via ft_user_email'); return; }

    // Layer 2: decode the Supabase JWT from supabase_access_token
    var token = localStorage.getItem('supabase_access_token') || '';
    if (token) {
      var email2 = getEmailFromJwt(token);
      console.log('[UserMgmt] JWT email:', email2);
      if (email2 && checkCurrentUserIsAdmin(email2)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via JWT'); return; }
    }

    // Layer 3: scan ALL localStorage values for Supabase session JSON (sb-*-auth-token)
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        var val = localStorage.getItem(key) || '';
        // Check if it's a JSON session object containing user.email
        if (val.indexOf('"email"') !== -1 || val.indexOf(SUPER_ADMIN_EMAIL) !== -1) {
          console.log('[UserMgmt] Found admin email hint in key:', key);
          // Try to parse as JSON session
          try {
            var parsed = JSON.parse(val);
            var foundEmail = (parsed.user && parsed.user.email)
              || (parsed.email)
              || (parsed.session && parsed.session.user && parsed.session.user.email)
              || '';
            if (foundEmail && checkCurrentUserIsAdmin(foundEmail)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via localStorage scan'); return; }
          } catch(pe) {
            // Plain string match
            if (val.toLowerCase().indexOf(SUPER_ADMIN_EMAIL.toLowerCase()) !== -1) {
              revealUserMgmtNav(); console.log('[UserMgmt] Revealed via plain string match'); return;
            }
          }
        }
      }
    } catch(e) { console.warn('[UserMgmt] localStorage scan error:', e); }

    // Layer 4: async IPC session check
    if (window.electron && window.electron.invoke) {
      console.log('[UserMgmt] Trying IPC getSession...');
      window.electron.invoke('supabase:getSession').then(function(sess) {
        console.log('[UserMgmt] IPC session result:', sess);
        if (sess && sess.ok && sess.session && sess.session.user) {
          if (checkCurrentUserIsAdmin(sess.session.user.email || '')) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via IPC'); }
        }
      }).catch(function(e){ console.warn('[UserMgmt] IPC error:', e); });
    }
  })();

  // ── Load users ───────────────────────────────────────────
  async function loadUserMgmt() {
    const tbody = document.getElementById('um-tbody');
    const counter = document.getElementById('um-counter');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">Loading users…</td></tr>';
    try {
      const res = await window.electron.invoke('supabase:auth', { action: 'listUsers' });
      if (!res?.ok) throw new Error(res?.error || 'Failed to list users');
      UM_USERS = res.users || [];
      if (counter) counter.textContent = UM_USERS.length + ' user' + (UM_USERS.length !== 1 ? 's' : '');
      renderUserTable(UM_USERS);
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#ef4444;">Error: ' + e.message + '</td></tr>';
    }
  }
  window.loadUserMgmt = loadUserMgmt;

  function renderUserTable(users) {
    const tbody = document.getElementById('um-tbody');
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(function(u) {
      const banned    = u.banned_until && new Date(u.banned_until) > new Date();
      const confirmed = !!(u.confirmed_at || u.email_confirmed_at);
      const lastSign  = u.last_sign_in_at
        ? new Date(u.last_sign_in_at).toLocaleDateString('en-ZA', {day:'2-digit',month:'short',year:'numeric'})
        : 'Never';
      const sa  = isSuperAdmin(u);
      const adm = isAdmin(u);
      const ini = (u.email ? u.email[0] : '?').toUpperCase();
      const id  = u.id || '';
      const em  = u.email || '—';

      const roleBadge = sa
        ? '<span style="font-size:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:4px;padding:2px 6px;margin-left:5px;">⭐ Super Admin</span>'
        : adm
          ? '<span style="font-size:10px;background:#6366f1;color:#fff;border-radius:4px;padding:2px 6px;margin-left:5px;">Admin</span>'
          : '';

      const avatarStyle = sa
        ? 'background:linear-gradient(135deg,#f59e0b,#d97706);'
        : adm ? '' : 'background:linear-gradient(135deg,#64748b,#475569);';

      const setPwBtn  = '<button class="um-btn um-btn-setpw" onclick="openSetPasswordModal(\'' + id + '\',\'' + em + '\')" title="Set password directly"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Set Password</button>';
      const emailBtn  = '<button class="um-btn um-btn-reset" onclick="resetUserPassword(\'' + em + '\',\'' + id + '\')" title="Send reset email"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Email Reset</button>';
      const suspBtn   = sa ? '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Protected</span>'
        : !banned
          ? '<button class="um-btn um-btn-suspend" onclick="suspendUser(\'' + id + '\',\'' + em + '\')">⛔ Suspend</button>'
          : '<button class="um-btn um-btn-unsuspend" onclick="unsuspendUser(\'' + id + '\',\'' + em + '\')">✓ Unsuspend</button>';
      const roleBtn   = sa ? ''
        : adm
          ? '<button class="um-btn um-btn-demote" onclick="removeAdmin(\'' + id + '\',\'' + em + '\')">↓ Remove Admin</button>'
          : '<button class="um-btn um-btn-promote" onclick="makeAdmin(\'' + id + '\',\'' + em + '\')">↑ Make Admin</button>';
      const delBtn    = sa ? '' : '<button class="um-btn um-btn-delete" onclick="deleteUser(\'' + id + '\',\'' + em + '\')">🗑 Delete</button>';

      return '<tr class="um-row' + (sa ? ' um-row-superadmin' : '') + '" data-id="' + id + '">'
        + '<td><div style="display:flex;align-items:center;gap:10px;">'
        +   '<div class="um-avatar" style="' + avatarStyle + '">' + ini + '</div>'
        +   '<div><div style="font-weight:600;font-size:13px;color:#1e293b;">' + em + roleBadge + '</div>'
        +   '<div style="font-size:11px;color:#94a3b8;font-family:monospace;">' + id.substring(0,8) + '…</div></div>'
        + '</div></td>'
        + '<td><span class="um-badge um-badge-' + (confirmed ? 'confirmed' : 'pending') + '">' + (confirmed ? '✓ Confirmed' : '⏳ Pending') + '</span></td>'
        + '<td><span class="um-badge um-badge-' + (banned ? 'suspended' : 'active') + '">' + (banned ? '⛔ Suspended' : '● Active') + '</span></td>'
        + '<td style="font-size:12px;color:#64748b;">' + lastSign + '</td>'
        + '<td><div style="display:flex;gap:5px;flex-wrap:wrap;">' + setPwBtn + emailBtn + roleBtn + suspBtn + delBtn + '</div></td>'
        + '</tr>';
    }).join('');
  }

  window.filterUserTable = function(q) {
    const f = q ? UM_USERS.filter(function(u){ return u.email && u.email.toLowerCase().indexOf(q.toLowerCase()) !== -1; }) : UM_USERS;
    renderUserTable(f);
    const c = document.getElementById('um-counter');
    if (c) c.textContent = f.length + ' user' + (f.length !== 1 ? 's' : '');
  };

  // ── Create / Invite modal ──────────────────────────────
  window.openUserMgmtModal = function() {
    var m = document.getElementById('um-create-modal');
    if (!m) return;
    document.getElementById('um-new-email').value = '';
    document.getElementById('um-new-password').value = '';
    document.getElementById('um-modal-error').textContent = '';
    document.getElementById('um-modal-success').textContent = '';
    m.style.display = 'flex';
    setTimeout(function(){ document.getElementById('um-new-email').focus(); }, 100);
  };
  window.closeUserMgmtModal = function() {
    var m = document.getElementById('um-create-modal');
    if (m) m.style.display = 'none';
  };
  window.submitCreateUser = async function() {
    var email = document.getElementById('um-new-email').value.trim();
    var pw    = document.getElementById('um-new-password').value.trim();
    var errEl = document.getElementById('um-modal-error');
    var sucEl = document.getElementById('um-modal-success');
    var btn   = document.getElementById('um-create-btn');
    errEl.textContent = ''; sucEl.textContent = '';
    if (!email) { errEl.textContent = 'Email is required.'; return; }
    if (pw && pw.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'inviteUser', email: email });
      if (!res?.ok) throw new Error(res?.error);
      if (pw) {
        var pr = await window.electron.invoke('supabase:auth', { action: 'setPasswordByEmail', email: email, password: pw });
        if (!pr?.ok) throw new Error('User created but password not set: ' + pr?.error);
      }
      sucEl.textContent = '✓ ' + email + ' created! ' + (pw ? 'Password set.' : 'Invite email sent.');
      setTimeout(function(){ closeUserMgmtModal(); loadUserMgmt(); }, 2000);
    } catch(e) { errEl.textContent = e.message; }
    finally { btn.disabled = false; btn.textContent = 'Create User'; }
  };

  // ── Set Password Directly modal ────────────────────────
  window.openSetPasswordModal = function(userId, email) {
    document.getElementById('um-setpw-userid').value = userId;
    document.getElementById('um-setpw-email-label').textContent = email;
    document.getElementById('um-setpw-new').value = '';
    document.getElementById('um-setpw-confirm').value = '';
    document.getElementById('um-setpw-error').textContent = '';
    document.getElementById('um-setpw-success').textContent = '';
    document.getElementById('um-setpw-modal').style.display = 'flex';
    setTimeout(function(){ document.getElementById('um-setpw-new').focus(); }, 100);
  };
  window.closeSetPasswordModal = function() {
    document.getElementById('um-setpw-modal').style.display = 'none';
  };
  window.submitSetPassword = async function() {
    var userId = document.getElementById('um-setpw-userid').value;
    var pw1    = document.getElementById('um-setpw-new').value;
    var pw2    = document.getElementById('um-setpw-confirm').value;
    var errEl  = document.getElementById('um-setpw-error');
    var sucEl  = document.getElementById('um-setpw-success');
    var btn    = document.getElementById('um-setpw-btn');
    errEl.textContent = ''; sucEl.textContent = '';
    if (!pw1)           { errEl.textContent = 'Password is required.'; return; }
    if (pw1.length < 8) { errEl.textContent = 'Minimum 8 characters.'; return; }
    if (pw1 !== pw2)    { errEl.textContent = 'Passwords do not match.'; return; }
    btn.disabled = true; btn.textContent = 'Setting…';
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'setPasswordDirect', userId: userId, password: pw1 });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      sucEl.textContent = '✓ Password updated successfully.';
      setTimeout(function(){ closeSetPasswordModal(); }, 1800);
    } catch(e) { errEl.textContent = e.message; }
    finally { btn.disabled = false; btn.textContent = 'Set Password'; }
  };

  // ── Email reset ────────────────────────────────────────
  window.resetUserPassword = async function(email, userId) {
    if (!confirm('Send a password reset email to ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'resetPassword', email: email });
      if (!res?.ok) throw new Error(res?.error);
      showToast('✓ Reset email sent to ' + email, 'ok', 4000);
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Make / Remove admin ────────────────────────────────
  window.makeAdmin = async function(userId, email) {
    if (!confirm('Grant admin privileges to ' + email + '?\n\nThey will be able to manage users.')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'makeAdmin', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      showToast('↑ ' + email + ' is now an Admin.', 'ok', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };
  window.removeAdmin = async function(userId, email) {
    if (!confirm('Remove admin privileges from ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'removeAdmin', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      showToast('↓ ' + email + ' is now a regular user.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Suspend / Unsuspend ────────────────────────────────
  window.suspendUser = async function(userId, email) {
    if (!confirm('Suspend account for ' + email + '?\n\nThey won\'t be able to log in.')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'suspendUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Suspend failed');
      showToast('⛔ ' + email + ' suspended.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };
  window.unsuspendUser = async function(userId, email) {
    if (!confirm('Restore access for ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'unsuspendUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Unsuspend failed');
      showToast('✓ ' + email + ' unsuspended.', 'ok', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Delete ────────────────────────────────────────────
  window.deleteUser = async function(userId, email) {
    if (!confirm('PERMANENTLY delete user ' + email + '?\n\nThis cannot be undone.')) return;
    if (!confirm('Second confirmation: delete ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'deleteUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Delete failed');
      showToast('🗑 ' + email + ' deleted.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // Load when view shown
  var _origSV = window.showView;
  if (typeof _origSV === 'function') {
    window.showView = function(viewId) {
      _origSV(viewId);
      if (viewId === 'view-user-mgmt') loadUserMgmt();
    };
  }

})();

