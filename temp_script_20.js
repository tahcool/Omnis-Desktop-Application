
(function() {
    'use strict';

    // ─── Constants ────────────────────────────────────────────────────────────
    const FT_BASE    = 'https://fleetrack.machinery-exchange.com';
    const FT_MODULE  = 'mxg_fleet_track.omnis_dashboard';
    const FT_DEFECTS = `${FT_MODULE}.ft_defects_dashboard`;
    const FT_BD      = `${FT_MODULE}.ft_breakdown_dashboard`;

    // ─── Shared FT machine cache ──────────────────────────────────────────────
    let _ftMachines = null;  // Populated lazily
    let _ftMachinesLoading = false;

    async function ensureFtMachines() {
        if (_ftMachines) return _ftMachines;
        if (_ftMachinesLoading) {
            // Wait for existing fetch
            while (_ftMachinesLoading) await new Promise(r => setTimeout(r, 100));
            return _ftMachines;
        }
        _ftMachinesLoading = true;
        try {
            const res = await window.callFrappeSequenced(FT_BASE, `${FT_BD}.get_ft_machine_register`, {});
            const machines = (res && res.machines) ? res.machines : (Array.isArray(res) ? res : []);
            _ftMachines = machines;
        } catch(e) {
            console.warn('[FT Integration] Could not load FT machines:', e.message);
            _ftMachines = [];
        }
        _ftMachinesLoading = false;
        return _ftMachines;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FEATURE 1: After-Sales → Fleetrack Status Badges
    // ─────────────────────────────────────────────────────────────────────────
    window.refreshAftersalesFtBadges = async function() {
        const btn = document.getElementById('as-ft-refresh-btn');
        if (btn) btn.querySelector('i').className = 'fas fa-circle-notch fa-spin';

        try {
            const machines = await ensureFtMachines();
            if (!machines || machines.length === 0) return;

            // Build serial→machine map (normalised to lowercase, strip spaces/dashes)
            const normalize = s => (s || '').toLowerCase().replace(/[\s\-]/g, '');
            const snMap = {};
            machines.forEach(m => {
                const sn = normalize(m.serial_number || m.serial_no || m.chassis_number || m.name || '');
                if (sn) snMap[sn] = m;
            });

            // Find all rows with data-as-sn
            const rows = document.querySelectorAll('[data-as-sn]');
            rows.forEach(row => {
                const sn = normalize(row.getAttribute('data-as-sn'));
                if (!sn) return;

                const badgeId = 'as-ft-' + (row.getAttribute('data-as-sn') || '').replace(/[^a-zA-Z0-9]/g, '-');
                const badgeEl = document.getElementById(badgeId);
                if (!badgeEl) return;

                const ftMachine = snMap[sn];
                if (!ftMachine) {
                    badgeEl.innerHTML = `<span style="font-size:10px;font-weight:700;color:#94a3b8;background:#f1f5f9;padding:3px 8px;border-radius:20px;letter-spacing:0.04em;" title="Not found in Fleetrack register">
                        <i class="fas fa-minus" style="font-size:9px;"></i> NOT IN FT
                    </span>`;
                    return;
                }

                const hasBd = ftMachine.open_bd_count > 0 || ftMachine.pt_status === 'bd_high';
                if (hasBd) {
                    badgeEl.innerHTML = `<span style="font-size:10px;font-weight:700;color:#d97706;background:#fef3c7;padding:3px 8px;border-radius:20px;letter-spacing:0.04em;" title="Machine in Fleetrack — has open breakdowns">
                        <i class="fas fa-exclamation-triangle" style="font-size:9px;"></i> HAS BD
                    </span>`;
                } else {
                    badgeEl.innerHTML = `<span style="font-size:10px;font-weight:700;color:#059669;background:#d1fae5;padding:3px 8px;border-radius:20px;letter-spacing:0.04em;" title="Machine registered in Fleetrack — no open breakdowns">
                        <i class="fas fa-check-circle" style="font-size:9px;"></i> IN FT
                    </span>`;
                }
            });
        } catch(e) {
            console.warn('[FT Badges] Error:', e.message);
        } finally {
            if (btn) btn.querySelector('i').className = 'fas fa-plug';
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    //  FEATURE 2: FT Defect Queue
    // ─────────────────────────────────────────────────────────────────────────
    let _ftqItems     = [];   // All loaded items (PSV+CDV with action_required)
    let _ftqTab       = 'all';
    let _ftqMachines  = null; // Populated once for machine search

    // Wire up view switch
    const _origShowViewFtq = window.showView;
    if (typeof _origShowViewFtq === 'function') {
        window.showView = function(viewId) {
            _origShowViewFtq(viewId);
            if (viewId === 'view-ft-defect-queue') {
                window.loadFtDefectQueue();
            }
        };
    }
    document.addEventListener('click', function(e) {
        const nav = e.target.closest('[data-view="view-ft-defect-queue"]');
        if (nav) setTimeout(() => window.loadFtDefectQueue(), 100);
    });

    window.ftqSwitchTab = function(tab) {
        _ftqTab = tab;
        ['all','psv','cdv'].forEach(t => {
            const btn = document.getElementById(`ftq-tab-${t}`);
            if (!btn) return;
            if (t === tab) {
                btn.style.background = 'rgba(192,57,43,0.8)';
                btn.style.color      = 'white';
            } else {
                btn.style.background = 'rgba(255,255,255,0.07)';
                btn.style.color      = 'rgba(255,255,255,0.6)';
            }
        });
        renderFtQueue();
    };

    window.loadFtDefectQueue = async function() {
        const body = document.getElementById('ftq-body');
        if (!body) return;

        body.innerHTML = `<div style="text-align:center;padding:80px 0;color:rgba(255,255,255,0.3);">
            <i class="fas fa-spinner fa-spin" style="font-size:28px;margin-bottom:16px;display:block;"></i>
            <div style="font-size:15px;font-weight:600;">Loading PSV &amp; CDV action items…</div>
        </div>`;

        try {
            const supabase = window.supabase || (window.electron && window.electron.supabase);

            // Fetch PSV action items
            let psvItems = [];
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('psv_logs')
                    .select('*')
                    .eq('action_required', true)
                    .order('visit_date', { ascending: false });
                if (!error && data) psvItems = data.map(p => ({ ...p, _source: 'PSV' }));
            } else if (window.electron) {
                const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'psv_logs', method: 'select',
                    params: { match: { action_required: true }, order: { column: 'visit_date', options: { ascending: false } } }
                });
                if (res.ok && res.data) psvItems = res.data.map(p => ({ ...p, _source: 'PSV' }));
            }

            // Fetch CDV action items
            let cdvItems = [];
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('cdv_logs')
                    .select('*')
                    .eq('action_required', true)
                    .order('visit_date', { ascending: false });
                if (!error && data) cdvItems = data.map(c => ({ ...c, _source: 'CDV' }));
            } else if (window.electron) {
                const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'cdv_logs', method: 'select',
                    params: { match: { action_required: true }, order: { column: 'visit_date', options: { ascending: false } } }
                });
                if (res.ok && res.data) cdvItems = res.data.map(c => ({ ...c, _source: 'CDV' }));
            }

            _ftqItems = [...psvItems, ...cdvItems].sort((a,b) =>
                new Date(b.visit_date || b.created_at || 0) - new Date(a.visit_date || a.created_at || 0)
            );

            // Update KPI counts
            const pending = _ftqItems.filter(i => !i.ft_defect_logged).length;
            const today   = new Date().toISOString().slice(0, 10);
            const logged  = _ftqItems.filter(i => i.ft_defect_logged && (i.ft_defect_logged_at || '').startsWith(today)).length;
            const pendEl = document.getElementById('ftq-count-pending');
            const logEl  = document.getElementById('ftq-count-logged');
            if (pendEl) pendEl.textContent = pending;
            if (logEl)  logEl.textContent  = logged;

            // Update sidebar badge
            const badge = document.getElementById('ft-queue-badge');
            if (badge) {
                badge.style.display = pending > 0 ? 'inline-block' : 'none';
                badge.textContent = pending;
            }

            renderFtQueue();
        } catch(e) {
            console.error('[FT Queue] Load error:', e);
            body.innerHTML = `<div style="text-align:center;padding:80px 0;color:#e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:16px;display:block;"></i>
                <div style="font-size:15px;font-weight:700;">Failed to load queue</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:6px;">${e.message}</div>
            </div>`;
        }
    };

    function renderFtQueue() {
        const body = document.getElementById('ftq-body');
        if (!body) return;

        let items = _ftqItems;
        if (_ftqTab === 'psv') items = items.filter(i => i._source === 'PSV');
        if (_ftqTab === 'cdv') items = items.filter(i => i._source === 'CDV');

        // Show pending only
        const pending = items.filter(i => !i.ft_defect_logged);

        if (pending.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:100px 0;color:rgba(255,255,255,0.25);">
                <i class="fas fa-check-circle" style="font-size:52px;margin-bottom:20px;display:block;color:rgba(39,174,96,0.3);"></i>
                <div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.4);">Queue is clear</div>
                <div style="font-size:13px;margin-top:6px;">No pending PSV or CDV defect items requiring Fleetrack review.</div>
            </div>`;
            return;
        }

        const condColors = { Good: '#27ae60', Fair: '#f39c12', Poor: '#e67e22', Critical: '#e74c3c' };
        const condBgs    = { Good: 'rgba(39,174,96,0.12)', Fair: 'rgba(243,156,18,0.12)', Poor: 'rgba(230,126,34,0.12)', Critical: 'rgba(231,76,60,0.12)' };

        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(480px,1fr));gap:16px;">` +
            pending.map(item => {
                const isPsv      = item._source === 'PSV';
                const typeBadge  = isPsv
                    ? `<span style="font-size:9px;font-weight:900;color:#f59e0b;background:rgba(245,158,11,0.15);padding:2px 8px;border-radius:20px;letter-spacing:0.08em;">PSV</span>`
                    : `<span style="font-size:9px;font-weight:900;color:#3b82f6;background:rgba(59,130,246,0.15);padding:2px 8px;border-radius:20px;letter-spacing:0.08em;">CDV</span>`;

                const cond  = item.overall_condition || '';
                const cc    = condColors[cond]  || '#94a3b8';
                const cbg   = condBgs[cond]     || 'rgba(148,163,184,0.1)';
                const dateStr = item.visit_date ? new Date(item.visit_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';
                const machineTxt = isPsv
                    ? `${item.machine_model || ''} ${item.machine_sn ? '· SN: '+item.machine_sn : ''}`
                    : (item.customer || '');
                const findings   = isPsv ? (item.findings || '') : (item.potential_issues || item.topics_discussed || '');
                const actionNotes = item.action_notes || '';

                const safeId = (item.id || '').replace(/[^a-zA-Z0-9\-]/g, '');
                const machineSn = item.machine_sn || item.machine_fleet_no || '';

                return `<div id="ftq-card-${safeId}" style="background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;"
                    onmouseover="this.style.borderColor='rgba(192,57,43,0.4)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow='none';">
                    <!-- Card Header -->
                    <div style="padding:16px 20px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                            ${typeBadge}
                            <span style="font-size:13px;font-weight:800;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.customer || 'Unknown Customer'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                            ${cond ? `<span style="font-size:10px;font-weight:800;color:${cc};background:${cbg};padding:3px 10px;border-radius:20px;">${cond}</span>` : ''}
                            <span style="font-size:11px;color:rgba(255,255,255,0.4);">${dateStr}</span>
                        </div>
                    </div>
                    <!-- Machine -->
                    ${machineTxt ? `<div style="padding:10px 20px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">
                        <i class="fas fa-cog" style="margin-right:6px;color:rgba(255,255,255,0.25);"></i>${machineTxt}
                    </div>` : ''}
                    <!-- Findings -->
                    ${findings ? `<div style="padding:10px 20px 0;">
                        <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Findings</div>
                        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;max-height:56px;overflow:hidden;mask-image:linear-gradient(to bottom,black 60%,transparent);">${findings}</div>
                    </div>` : ''}
                    <!-- Action Notes -->
                    <div style="padding:10px 20px;">
                        <div style="font-size:10px;font-weight:800;color:#e74c3c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Action Required</div>
                        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);padding:10px 14px;background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:8px;line-height:1.5;">${actionNotes || '(No notes specified)'}</div>
                    </div>
                    <!-- Actions -->
                    <div style="padding:14px 20px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.05);">
                        <button onclick="window.ftqOpenLogModal('${safeId}','${item._source}','${machineSn.replace(/'/g,"\\'")}','${(actionNotes||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}','${(findings||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}')"
                            style="flex:2;padding:11px 0;background:linear-gradient(135deg,#c0392b,#8b2219);border:none;color:white;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(192,57,43,0.3);transition:opacity 0.2s;"
                            onmouseover="this.style.opacity='0.85';" onmouseout="this.style.opacity='1';">
                            <i class="fas fa-tools"></i> Log Defect in FT
                        </button>
                        <button onclick="window.ftqDismissItem('${safeId}','${item._source}')"
                            style="flex:1;padding:11px 0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;transition:all 0.2s;"
                            onmouseover="this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';">
                            <i class="fas fa-times"></i> Dismiss
                        </button>
                    </div>
                </div>`;
            }).join('') + `</div>`;
    }

    // ── Open Log Defect Modal ─────────────────────────────────────────────────
    window.ftqOpenLogModal = async function(itemId, source, machineSn, actionNotes, findings) {
        const modal = document.getElementById('ftq-log-modal');
        if (!modal) return;

        document.getElementById('ftq-modal-visit-id').value   = itemId;
        document.getElementById('ftq-modal-visit-type').value = source;
        document.getElementById('ftq-modal-machine-sn').value = machineSn;
        document.getElementById('ftq-modal-machine-input').value   = '';
        document.getElementById('ftq-modal-machine-docname').value = '';
        document.getElementById('ftq-modal-defect-type').value = 'Major';
        document.getElementById('ftq-modal-priority').value    = 'Medium';
        document.getElementById('ftq-modal-description').value = actionNotes || findings || '';
        document.getElementById('ftq-modal-error').style.display = 'none';
        document.getElementById('ftq-machine-dropdown').style.display = 'none';

        // Context card
        document.getElementById('ftq-modal-context').innerHTML = `
            <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;">${source} Visit</span>
            ${machineSn ? `<br><b style="color:white;">Machine SN:</b> ${machineSn}` : ''}
            ${actionNotes ? `<br><b style="color:rgba(255,255,255,0.6);">Action:</b> ${actionNotes}` : ''}`;

        // Pre-populate machine search if we have SN
        if (machineSn) {
            document.getElementById('ftq-modal-machine-input').value = machineSn;
            await window.ftqSearchMachine(machineSn, true);
        }

        modal.style.display = 'flex';
    };

    window.ftqCloseModal = function() {
        const modal = document.getElementById('ftq-log-modal');
        if (modal) modal.style.display = 'none';
    };

    // ── Machine search in modal ───────────────────────────────────────────────
    window.ftqSearchMachine = async function(query, autoSelect) {
        const dd = document.getElementById('ftq-machine-dropdown');
        if (!dd) return;

        const machines = await ensureFtMachines();
        if (!machines || machines.length === 0) { dd.style.display = 'none'; return; }

        const q = (query || '').toLowerCase().trim();
        const matches = q.length < 1 ? [] : machines.filter(m => {
            const sn  = (m.serial_number || m.serial_no || m.chassis_number || '').toLowerCase();
            const nm  = (m.name || '').toLowerCase();
            const mdl = (m.model || '').toLowerCase();
            const cust = (m.customer || '').toLowerCase();
            return sn.includes(q) || nm.includes(q) || mdl.includes(q) || cust.includes(q);
        }).slice(0, 10);

        if (autoSelect && matches.length === 1) {
            document.getElementById('ftq-modal-machine-input').value   = `${matches[0].name} — ${matches[0].model || ''}`.trim();
            document.getElementById('ftq-modal-machine-docname').value = matches[0].name;
            dd.style.display = 'none';
            return;
        }

        if (matches.length === 0) { dd.style.display = 'none'; return; }

        dd.innerHTML = matches.map(m => `
            <div onclick="window.ftqSelectMachine('${m.name}','${(m.model||'').replace(/'/g,"\\'")}','${(m.serial_number||m.serial_no||'').replace(/'/g,"\\'")} ')"
                style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s;"
                onmouseover="this.style.background='rgba(192,57,43,0.15)';" onmouseout="this.style.background='transparent';">
                <div style="font-size:13px;font-weight:700;color:white;">${m.name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${m.model||''} ${m.customer ? '· '+m.customer : ''} ${m.serial_number||m.serial_no ? '· SN:'+( m.serial_number||m.serial_no) : ''}</div>
            </div>`).join('');
        dd.style.display = 'block';
    };

    window.ftqSelectMachine = function(docname, model, sn) {
        document.getElementById('ftq-modal-machine-input').value   = `${docname} — ${model}`.trim();
        document.getElementById('ftq-modal-machine-docname').value = docname;
        document.getElementById('ftq-machine-dropdown').style.display = 'none';
    };

    // ── Submit defect to Fleetrack ────────────────────────────────────────────
    window.ftqSubmitDefect = async function() {
        const machine      = document.getElementById('ftq-modal-machine-docname').value.trim();
        const defect_type  = document.getElementById('ftq-modal-defect-type').value;
        const priority     = document.getElementById('ftq-modal-priority').value;
        const description  = document.getElementById('ftq-modal-description').value.trim();
        const visitId      = document.getElementById('ftq-modal-visit-id').value;
        const visitType    = document.getElementById('ftq-modal-visit-type').value;
        const errEl        = document.getElementById('ftq-modal-error');
        const btn          = document.getElementById('ftq-modal-submit-btn');

        errEl.style.display = 'none';
        if (!machine) { errEl.innerHTML = 'Please select a machine from the dropdown.'; errEl.style.display = 'block'; return; }
        if (!description) { errEl.innerHTML = 'Please provide a description of the defect.'; errEl.style.display = 'block'; return; }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in Fleetrack…';
        btn.disabled  = true;

        try {
            // Call Fleetrack create_ft_defect
            const res = await window.callFrappeSequenced(FT_BASE, `${FT_DEFECTS}.create_ft_defect`, {
                machine, defect_type, priority, description
            });

            if (!res || res.error) throw new Error(res && res.error ? res.error : 'Fleetrack returned an error');

            const defectName = res.name || res.ok;

            // Mark item as logged in Supabase (fire-and-forget, best effort)
            const table = visitType === 'PSV' ? 'psv_logs' : 'cdv_logs';
            const updatePayload = {
                ft_defect_logged: true,
                ft_defect_name: defectName || 'logged',
                ft_defect_logged_at: new Date().toISOString()
            };
            try {
                if (window.supabase) {
                    await window.supabase.from(table).update(updatePayload).eq('id', visitId);
                } else if (window.electron) {
                    await window.electron.ipcRenderer.invoke('supabase:query', {
                        table, method: 'upsert',
                        data: { id: visitId, ...updatePayload }
                    });
                }
                // Update local state
                const item = _ftqItems.find(i => String(i.id) === String(visitId));
                if (item) { item.ft_defect_logged = true; item.ft_defect_name = defectName; }
            } catch(updateErr) {
                console.warn('[FT Queue] Could not mark as logged in Supabase:', updateErr.message);
            }

            window.ftqCloseModal();
            window.showToast && window.showToast(`Defect logged in Fleetrack${defectName ? ': ' + defectName : ''}`, 'success');

            // Remove card from view
            const card = document.getElementById(`ftq-card-${visitId}`);
            if (card) {
                card.style.transition = 'opacity 0.4s, transform 0.4s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 400);
            }

            // Update pending counter
            const pending = _ftqItems.filter(i => !i.ft_defect_logged).length;
            const countEl = document.getElementById('ftq-count-pending');
            if (countEl) countEl.textContent = pending;
            const badge = document.getElementById('ft-queue-badge');
            if (badge) { badge.style.display = pending > 0 ? 'inline-block' : 'none'; badge.textContent = pending; }

        } catch(e) {
            console.error('[FT Queue] Submit defect error:', e);
            errEl.innerHTML = `Failed: ${e.message}`;
            errEl.style.display = 'block';
        } finally {
            btn.innerHTML = '<i class="fas fa-tools"></i> Log Defect in Fleetrack';
            btn.disabled  = false;
        }
    };

    // ── Dismiss (mark as reviewed, no defect) ────────────────────────────────
    window.ftqDismissItem = async function(itemId, source) {
        if (!confirm('Dismiss this item? It will be marked as reviewed without logging a Fleetrack defect.')) return;

        const table = source === 'PSV' ? 'psv_logs' : 'cdv_logs';
        try {
            if (window.supabase) {
                await window.supabase.from(table).update({ ft_defect_logged: true, ft_defect_name: 'dismissed', ft_defect_logged_at: new Date().toISOString() }).eq('id', itemId);
            } else if (window.electron) {
                await window.electron.ipcRenderer.invoke('supabase:query', {
                    table, method: 'upsert',
                    data: { id: itemId, ft_defect_logged: true, ft_defect_name: 'dismissed', ft_defect_logged_at: new Date().toISOString() }
                });
            }
            const item = _ftqItems.find(i => String(i.id) === String(itemId));
            if (item) item.ft_defect_logged = true;

            const card = document.getElementById(`ftq-card-${itemId}`);
            if (card) {
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }

            const pending = _ftqItems.filter(i => !i.ft_defect_logged).length;
            const countEl = document.getElementById('ftq-count-pending');
            if (countEl) countEl.textContent = pending;
            const badge = document.getElementById('ft-queue-badge');
            if (badge) { badge.style.display = pending > 0 ? 'inline-block' : 'none'; badge.textContent = pending; }
            window.showToast && window.showToast('Item dismissed from queue.', 'info');
        } catch(e) {
            console.error('[FT Queue] Dismiss error:', e);
            window.showToast && window.showToast('Failed to dismiss: ' + e.message, 'error');
        }
    };

})();
