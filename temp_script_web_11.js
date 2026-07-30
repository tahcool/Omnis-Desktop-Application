
(function() {
    'use strict';

    // ── Supabase client for Salestrack DB (same project, read-only from here) ──
    const SUPA_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
    // Reuse the key that main.js uses — it's already in global scope via electron IPC
    // We call via electron IPC so we don't need to expose the key in browser
    async function supaQuery(table, filters) {
        if (window.electron && window.electron.ipcRenderer) {
            const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                table, method: 'select',
                params: { match: filters, order: { column: 'visit_date', options: { ascending: false } } }
            });
            return (res.ok && res.data) ? res.data : [];
        }
        // Fallback: direct fetch if supabase client is available
        if (window._ftSupa) {
            const q = window._ftSupa.from(table).select('*').order('visit_date', { ascending: false });
            Object.entries(filters||{}).forEach(([k,v]) => q.eq(k, v));
            const { data } = await q;
            return data || [];
        }
        return [];
    }

    async function supaUpdate(table, id, payload) {
        if (window.electron && window.electron.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('supabase:query', {
                table, method: 'upsert', data: { id, ...payload }
            });
        } else if (window._ftSupa) {
            await window._ftSupa.from(table).update(payload).eq('id', id);
        }
    }

    // ── State ───────────────────────────────────────────────────────────────
    let _items  = [];
    let _tab    = 'all';
    let _ftMachineCache = null;

    async function getFtMachines() {
        if (_ftMachineCache) return _ftMachineCache;
        try {
            const res = await frappe.call({ method: 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', args: {} });
            _ftMachineCache = (res.message && res.message.machines) ? res.message.machines : (Array.isArray(res.message) ? res.message : []);
        } catch(e) { _ftMachineCache = []; }
        return _ftMachineCache;
    }

    // ── Hook into showView ──────────────────────────────────────────────────
    const _origFt2 = window.showView;
    if (typeof _origFt2 === 'function') {
        window.showView = function(id) {
            _origFt2(id);
            if (id === 'view-ft-psv-queue') {
                const v = document.getElementById('view-ft-psv-queue');
                if (v) v.style.display = 'block';
                window.ftq2Load();
            } else {
                const v = document.getElementById('view-ft-psv-queue');
                if (v) v.style.display = 'none';
            }
        };
    }

    // ── Load ────────────────────────────────────────────────────────────────
    window.ftq2Load = async function() {
        const body = document.getElementById('ftq2-body');
        if (!body) return;
        body.innerHTML = `<div style="text-align:center;padding:80px 0;color:rgba(255,255,255,0.3);"><div style="font-size:28px;margin-bottom:16px;">⏳</div><div style="font-size:15px;font-weight:600;">Loading action items…</div></div>`;

        try {
            const [psv, cdv] = await Promise.all([
                supaQuery('psv_logs', { action_required: true }),
                supaQuery('cdv_logs', { action_required: true })
            ]);
            _items = [
                ...psv.map(p => ({...p, _src:'PSV'})),
                ...cdv.map(c => ({...c, _src:'CDV'}))
            ].filter(i => !i.ft_defect_logged)
             .sort((a,b) => new Date(b.visit_date||b.created_at||0) - new Date(a.visit_date||a.created_at||0));

            const pending = _items.length;
            const el = document.getElementById('ftq2-count-pending');
            if (el) el.textContent = pending;
            const badge = document.getElementById('ft-psv-queue-badge');
            if (badge) { badge.style.display = pending > 0 ? 'inline' : 'none'; badge.textContent = pending; }

            ftq2Render();
        } catch(e) {
            body.innerHTML = `<div style="text-align:center;padding:80px 0;color:#e74c3c;"><div style="font-size:15px;font-weight:700;">Failed to load: ${e.message}</div></div>`;
        }
    };

    window.ftq2Tab = function(tab) {
        _tab = tab;
        ['all','psv','cdv'].forEach(t => {
            const b = document.getElementById(`ftq2-tab-${t}`);
            if (!b) return;
            b.style.background = t === tab ? 'rgba(192,57,43,0.8)' : 'rgba(255,255,255,0.07)';
            b.style.color      = t === tab ? 'white'              : 'rgba(255,255,255,0.6)';
        });
        ftq2Render();
    };

    function ftq2Render() {
        const body = document.getElementById('ftq2-body');
        if (!body) return;
        let items = _items;
        if (_tab === 'psv') items = items.filter(i => i._src === 'PSV');
        if (_tab === 'cdv') items = items.filter(i => i._src === 'CDV');

        if (items.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:100px 0;color:rgba(255,255,255,0.25);">
                <div style="font-size:52px;margin-bottom:20px;color:rgba(39,174,96,0.3);">✔</div>
                <div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.4);">Queue is clear</div>
                <div style="font-size:13px;margin-top:6px;">No pending PSV/CDV items requiring Fleetrack review.</div>
            </div>`;
            return;
        }

        const cc = { Good:'#27ae60', Fair:'#f39c12', Poor:'#e67e22', Critical:'#e74c3c' };
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px;">` +
            items.map(item => {
                const sid   = (item.id||'').replace(/[^a-zA-Z0-9\-]/g,'');
                const typBg = item._src==='PSV' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)';
                const typCl = item._src==='PSV' ? '#f59e0b' : '#3b82f6';
                const cond  = item.overall_condition||'';
                const condCl= cc[cond]||'#94a3b8';
                const ds    = item.visit_date ? new Date(item.visit_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';
                const mach  = item._src==='PSV' ? `${item.machine_model||''} ${item.machine_sn ? '· SN:'+item.machine_sn : ''}` : '';
                const finds = item._src==='PSV' ? (item.findings||'') : (item.potential_issues||item.topics_discussed||'');
                const notes = item.action_notes||'';
                const sn    = item.machine_sn||item.machine_fleet_no||'';
                return `<div id="ftq2-card-${sid}" style="background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;"
                    onmouseover="this.style.borderColor='rgba(192,57,43,0.4)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow='none';">
                    <div style="padding:14px 18px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:9px;font-weight:900;color:${typCl};background:${typBg};padding:2px 8px;border-radius:20px;">${item._src}</span>
                            <span style="font-size:13px;font-weight:800;color:white;">${item.customer||'Unknown'}</span>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                            ${cond ? `<span style="font-size:10px;font-weight:800;color:${condCl};background:${condCl}18;padding:3px 10px;border-radius:20px;">${cond}</span>` : ''}
                            <span style="font-size:11px;color:rgba(255,255,255,0.4);">${ds}</span>
                        </div>
                    </div>
                    ${mach ? `<div style="padding:8px 18px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">⚙ ${mach.trim()}</div>` : ''}
                    ${finds ? `<div style="padding:8px 18px 0;"><div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Findings</div><div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;max-height:54px;overflow:hidden;">${finds}</div></div>` : ''}
                    <div style="padding:8px 18px 12px;">
                        <div style="font-size:10px;font-weight:800;color:#e74c3c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Action Required</div>
                        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);padding:10px 14px;background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:8px;line-height:1.5;">${notes||'(No notes)'}</div>
                    </div>
                    <div style="padding:12px 18px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.05);">
                        <button onclick="window.ftq2OpenModal('${sid}','${(notes||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}','${(sn||'').replace(/'/g,"\\'")}')"
                            style="flex:2;padding:10px;background:linear-gradient(135deg,#c0392b,#8b2219);border:none;color:white;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"
                            onmouseover="this.style.opacity='.85';" onmouseout="this.style.opacity='1';">⚒ Log Defect</button>
                        <button onclick="window.ftq2Dismiss('${sid}','${item._src}')"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;"
                            onmouseover="this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';">✕ Dismiss</button>
                    </div>
                </div>`;
            }).join('') + `</div>`;
    }

    // ── Modal ───────────────────────────────────────────────────────────────
    window.ftq2OpenModal = async function(itemId, notes, sn) {
        const m = document.getElementById('ftq2-modal');
        if (!m) return;
        document.getElementById('ftq2-visit-id').value      = itemId;
        document.getElementById('ftq2-machine-input').value = sn || '';
        document.getElementById('ftq2-machine-docname').value = '';
        document.getElementById('ftq2-defect-type').value   = 'Major';
        document.getElementById('ftq2-priority').value      = 'Medium';
        document.getElementById('ftq2-description').value   = notes || '';
        document.getElementById('ftq2-error').style.display = 'none';
        document.getElementById('ftq2-machine-dd').style.display = 'none';
        document.getElementById('ftq2-modal-ctx').innerHTML = `<b style="color:white;">SN:</b> ${sn||'—'}<br><b style="color:rgba(255,255,255,0.6);">Action:</b> ${notes||'—'}`;
        if (sn) await window.ftq2SearchMachine(sn, true);
        m.style.display = 'flex';
    };

    window.ftq2CloseModal = function() {
        const m = document.getElementById('ftq2-modal');
        if (m) m.style.display = 'none';
    };

    window.ftq2SearchMachine = async function(q, auto) {
        const dd = document.getElementById('ftq2-machine-dd');
        if (!dd) return;
        const machines = await getFtMachines();
        const qlo = (q||'').toLowerCase().trim();
        if (!qlo) { dd.style.display='none'; return; }
        const hits = machines.filter(m => {
            return [(m.serial_number||m.serial_no||m.chassis_number||''),(m.name||''),(m.model||''),(m.customer||'')]
                .some(s => s.toLowerCase().includes(qlo));
        }).slice(0,10);
        if (auto && hits.length===1) {
            document.getElementById('ftq2-machine-input').value   = `${hits[0].name} — ${hits[0].model||''}`;
            document.getElementById('ftq2-machine-docname').value = hits[0].name;
            dd.style.display='none'; return;
        }
        if (!hits.length) { dd.style.display='none'; return; }
        dd.innerHTML = hits.map(m => `<div onclick="window.ftq2PickMachine('${m.name}','${(m.model||'').replace(/'/g,"\\'")}' )"
            style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);"
            onmouseover="this.style.background='rgba(192,57,43,0.15)';" onmouseout="this.style.background='transparent';">
            <div style="font-size:13px;font-weight:700;color:white;">${m.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">${m.model||''} ${m.customer ? '·'+m.customer : ''}</div>
        </div>`).join('');
        dd.style.display='block';
    };

    window.ftq2PickMachine = function(docname, model) {
        document.getElementById('ftq2-machine-input').value   = `${docname} — ${model}`.trim();
        document.getElementById('ftq2-machine-docname').value = docname;
        document.getElementById('ftq2-machine-dd').style.display = 'none';
    };

    window.ftq2Submit = async function() {
        const machine     = document.getElementById('ftq2-machine-docname').value.trim();
        const defect_type = document.getElementById('ftq2-defect-type').value;
        const priority    = document.getElementById('ftq2-priority').value;
        const description = document.getElementById('ftq2-description').value.trim();
        const visitId     = document.getElementById('ftq2-visit-id').value;
        const errEl       = document.getElementById('ftq2-error');
        const btn         = document.getElementById('ftq2-submit-btn');

        errEl.style.display = 'none';
        if (!machine)     { errEl.textContent='Please select a machine.'; errEl.style.display='block'; return; }
        if (!description) { errEl.textContent='Please provide a description.'; errEl.style.display='block'; return; }

        btn.innerHTML = '⏳ Logging…'; btn.disabled = true;

        try {
            const res = await frappe.call({
                method: 'mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.create_ft_defect',
                args: { machine, defect_type, priority, description }
            });
            const r = res.message || {};
            if (r.error) throw new Error(r.error);

            // Mark as logged in Salestrack Supabase
            const item = _items.find(i => (i.id||'').replace(/[^a-zA-Z0-9\-]/g,'') === visitId);
            if (item) {
                await supaUpdate(item._src==='PSV' ? 'psv_logs' : 'cdv_logs', item.id, {
                    ft_defect_logged: true,
                    ft_defect_name: r.name || 'logged',
                    ft_defect_logged_at: new Date().toISOString()
                });
                item.ft_defect_logged = true;
            }

            window.ftq2CloseModal();
            showToast(`Defect logged${r.name ? ': '+r.name : ''}`, 'ok', 3000);

            const card = document.getElementById(`ftq2-card-${visitId}`);
            if (card) { card.style.transition='opacity 0.4s'; card.style.opacity='0'; setTimeout(()=>card.remove(),400); }

            const pending = _items.filter(i=>!i.ft_defect_logged).length;
            const el = document.getElementById('ftq2-count-pending'); if(el) el.textContent=pending;
            const badge = document.getElementById('ft-psv-queue-badge');
            if(badge){ badge.style.display=pending>0?'inline':'none'; badge.textContent=pending; }
        } catch(e) {
            errEl.textContent = 'Failed: ' + e.message; errEl.style.display='block';
        } finally {
            btn.innerHTML = '⚒ Log Defect'; btn.disabled=false;
        }
    };

    window.ftq2Dismiss = async function(itemId, src) {
        if (!confirm('Dismiss without logging? This removes it from the queue.')) return;
        const item = _items.find(i => (i.id||'').replace(/[^a-zA-Z0-9\-]/g,'') === itemId);
        if (item) {
            try { await supaUpdate(src==='PSV'?'psv_logs':'cdv_logs', item.id, { ft_defect_logged:true, ft_defect_name:'dismissed', ft_defect_logged_at:new Date().toISOString() }); }
            catch(e){/* ignore */}
            item.ft_defect_logged = true;
        }
        const card = document.getElementById(`ftq2-card-${itemId}`);
        if (card) { card.style.transition='opacity 0.3s'; card.style.opacity='0'; setTimeout(()=>card.remove(),300); }
        const pending = _items.filter(i=>!i.ft_defect_logged).length;
        const el = document.getElementById('ftq2-count-pending'); if(el) el.textContent=pending;
        showToast('Dismissed from queue.', 'ok', 2000);
        // Also update dashboard KPI
        window.updatePsvKpiCard(pending);
    };

    // Expose KPI updater globally so queue loads can also refresh it
    window.updatePsvKpiCard = function(pending) {
        const countEl = document.getElementById('kpi-psv-queue-count');
        const subEl   = document.getElementById('kpi-psv-queue-sub');
        const stripe  = document.getElementById('kpi-psv-stripe');
        const card    = document.getElementById('kpi-card-psv-queue');
        const badge   = document.getElementById('ft-psv-queue-badge');
        if (countEl) countEl.textContent = pending;
        if (subEl)   subEl.textContent   = pending > 0 ? `${pending} pending — click to review` : 'All clear ✔';
        if (stripe)  stripe.style.display = pending > 0 ? 'block' : 'none';
        if (card) {
            card.style.borderLeftColor = pending > 0 ? '#c0392b' : '#27ae60';
            if (pending > 0) {
                card.classList.add('kpi-psv-flashing');
            } else {
                card.classList.remove('kpi-psv-flashing');
                card.style.background   = '#fff';
                card.style.boxShadow    = '';
            }
        }
        if (badge)   { badge.style.display = pending > 0 ? 'inline' : 'none'; badge.textContent = pending; }
    };

})();
