
    // Re-initialize modal elements after they've been relocated to the bottom of the DOM
    window.mcModalOverlay = document.getElementById("mc-modal-overlay");
    window.mcTitle = document.getElementById("mc-title");
    window.mcSubtitle = document.getElementById("mc-subtitle");
    window.mcBody = document.getElementById("mc-body");
    window.mcAddBreakdown = document.getElementById("mc-add-breakdown");
    window.mcAddHmr = document.getElementById("mc-add-hmr");
    window.mcEditMachine = document.getElementById("mc-edit-machine");
    window.mcClose = document.getElementById("mc-close");
    if (window.mcEditMachine) {
      window.mcEditMachine.addEventListener('click', function() {
        var name = (window.MC_CURRENT_MACHINE && window.MC_CURRENT_MACHINE.name) || '';
        if (name) openEditMachineModal(name);
      });
    }
    
    // Safety check
    if (window.ftDebugLog) window.ftDebugLog("Modal elements re-registered at bottom.");
    
    // Add actions
    if (window.mcAddHmr) {
      window.mcAddHmr.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openHmrLogModal === "function") {
          window.openHmrLogModal(window.MC_CURRENT_MACHINE);
        }
      });
    }
    
    if (window.mcAddBreakdown) {
      window.mcAddBreakdown.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openCreateModal === "function") {
          window.openCreateModal(window.MC_CURRENT_MACHINE.name);
        }
      });
    }
    
    // Add close listeners for the new elements
    const setModalHidden = () => {
      if (window.mcModalOverlay) {
        window.mcModalOverlay.classList.add("hidden");
        window.mcModalOverlay.style.setProperty("display", "none", "important");
      }
    };

    if (window.mcClose) {
      window.mcClose.addEventListener("click", setModalHidden);
    }
    
    if (window.mcModalOverlay) {
      window.mcModalOverlay.addEventListener("click", (e) => {
        if (e.target === window.mcModalOverlay) {
          setModalHidden();
        }
      });
    }
  
window.loadISR = async function() {
      const region = document.getElementById('isr-filter-region')?.value || '';
      const container = document.getElementById('isr-table-container');
      const kpi = document.getElementById('isr-kpi-badge');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">? Loading ISR data...</div>';
      try {
        const params = { range: { from: 0, to: 9999 } };
        if (region) params.match = { region: region };
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: params
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        const allMachines = raw.data || [];
        ISR_ROWS = allMachines.filter(m => !m.last_service_date);
        if (kpi) {
          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' - No Service Date';
          kpi.style.display = 'block';
        }
        renderISRTable(ISR_ROWS);
      } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:13px;">? Error loading ISR: ' + e.message + '</div>';
        console.error('[ISR] load error:', e);
      }
    }

    // ════════════════════════════════════════════════════════
    //  NATIVE STANDALONE REPORT ENGINE
    //  Data source: Frappe API now → swap fetchReport() for Supabase later
    // ════════════════════════════════════════════════════════

    // ── Shared helpers ───────────────────────────────────────

    function rptBadge(text, cls) {
      return '<span class="rpt-badge rpt-badge-' + cls + '">' + (text || '—') + '</span>';
    }
    function rptEmpty(colspan, msg) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading">' + (msg || 'No data found') + '</td></tr>';
    }
    function rptError(colspan, err) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading" style="color:#ef4444;">Error: ' + (err || 'Failed to load') + '</td></tr>';
    }
    function daysBetween(d1, d2) {
      if (!d1 || !d2) return null;
      return Math.round((new Date(d2) - new Date(d1)) / 86400000);
    }
    function fmtDate(s) {
      if (!s) return '—';
      try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; }
    }

    // ── Column filter (text search) ──────────────────────────
    function filterRptTable(tableId, q, colIdxs) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const ql = (q || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const match = !ql || colIdxs.some(ci => {
          const cell = row.cells[ci];
          return cell && cell.textContent.toLowerCase().includes(ql);
        });
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── Select filter ────────────────────────────────────────
    function filterRptTableSelect(tableId, val, colIdx) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const vl = (val || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const cell = row.cells[colIdx];
        const match = !vl || (cell && cell.textContent.toLowerCase().includes(vl));
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── CSV Export ───────────────────────────────────────────
    function exportRptCsv(tableId, filename) {
      const table = document.getElementById(tableId);
      if (!table) return;
      let csv = '';
      table.querySelectorAll('tr').forEach(row => {
        if (row.classList.contains('rpt-row-hidden')) return;
        const cells = Array.from(row.querySelectorAll('th,td'));
        csv += cells.map(c => '"' + c.textContent.replace(/"/g,'""').trim() + '"').join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
    }

    // ── Sortable columns ─────────────────────────────────────
    function initRptSort(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return;
      table.querySelectorAll('thead th').forEach((th, idx) => {
        th._sortDir = 1;
        th.addEventListener('click', () => {
          const tbody = table.querySelector('tbody');
          const rows  = Array.from(tbody.querySelectorAll('tr:not(.rpt-row-hidden)'));
          rows.sort((a, b) => {
            const av = (a.cells[idx] || {}).textContent || '';
            const bv = (b.cells[idx] || {}).textContent || '';
            const an = parseFloat(av), bn = parseFloat(bv);
            if (!isNaN(an) && !isNaN(bn)) return (an - bn) * th._sortDir;
            return av.localeCompare(bv) * th._sortDir;
          });
          th._sortDir *= -1;
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    }

    // ════════════════════════════════════════════════════════
    //  1. FT MACHINE REGISTER
    // ════════════════════════════════════════════════════════
    async function loadRptMachineReg() {
      const tbody = document.getElementById('mr2-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = {
          region:           document.getElementById('mr2-region')?.value || '',
          customer:         document.getElementById('mr2-customer')?.value || '',
          model:            document.getElementById('mr2-model')?.value || '',
          warranty_status:  document.getElementById('mr2-warranty-filter')?.value || '',
          status:           document.getElementById('mr2-status-filter')?.value || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const machines = (res?.message?.data) || (Array.isArray(res?.message) ? res.message : []);
        if (!machines.length) { tbody.innerHTML = rptEmpty(10); return; }

        // KPIs
        let active=0, maint=0, warranty=0;
        machines.forEach(m => {
          if (m.status === 'Active') active++;
          if (m.status === 'Under Maintenance') maint++;
          if (m.warranty_status === 'Under Warranty') warranty++;
        });
        document.getElementById('mr2-total').textContent    = machines.length;
        document.getElementById('mr2-active').textContent   = active;
        document.getElementById('mr2-maint').textContent    = maint;
        document.getElementById('mr2-warranty').textContent = warranty;

        const statusBadge = s => {
          if (s === 'Active') return rptBadge(s, 'green');
          if (s === 'Under Maintenance') return rptBadge('Maint.', 'yellow');
          if (s === 'Inactive') return rptBadge(s, 'gray');
          return rptBadge(s, 'gray');
        };
        const wBadge = w => {
          if (w === 'Under Warranty') return rptBadge(w, 'green');
          if (w === 'Out of Warranty') return rptBadge('Out', 'red');
          return rptBadge(w || '—', 'gray');
        };

        tbody.innerHTML = machines.map(m => `
          <tr>
            <td><strong>${m.mxg_fleet_no || '—'}</strong>${m.fleet_no ? '<br><span style="font-size:10px;color:#94a3b8;">Ref: '+m.fleet_no+'</span>':''}</td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td style="text-align:right;font-weight:600;">${m.current_hmr || '—'}</td>
            <td>${m.location || '—'}</td>
            <td>${m.region || '—'}</td>
            <td>${statusBadge(m.status)}</td>
            <td>${wBadge(m.warranty_status)}${m.warranty_expiry?'<br><span style="font-size:10px;color:#94a3b8;">Exp: '+fmtDate(m.warranty_expiry)+'</span>':''}</td>
            <td>${fmtDate(m.commission_date)}</td>
          </tr>`).join('');
        initRptSort('mr2-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  2. MACHINES DUE FOR SERVICE
    // ════════════════════════════════════════════════════════
    async function loadRptDueService() {
      const tbody = document.getElementById('ds-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = { region: document.getElementById('ds-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const all = (res?.message?.data) || [];
        const SERVICE_INTERVAL = 500;
        const WARN_THRESHOLD   = 500;

        const machines = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)    || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            const next = last + SERVICE_INTERVAL;
            const diff = next - cur;
            return { ...m, cur, last, next, diff };
          })
          .filter(m => m.diff <= WARN_THRESHOLD)
          .sort((a, b) => a.diff - b.diff);

        if (!machines.length) { tbody.innerHTML = rptEmpty(10, 'No machines due for service'); return; }

        let overdue=0, soon=0;
        machines.forEach(m => { if (m.diff <= 0) overdue++; else soon++; });
        document.getElementById('ds-overdue').textContent = overdue;
        document.getElementById('ds-soon').textContent    = soon;
        document.getElementById('ds-total').textContent   = machines.length;

        tbody.innerHTML = machines.map(m => {
          const isOverdue = m.diff <= 0;
          const badge = isOverdue
            ? rptBadge('OVERDUE', 'red')
            : rptBadge('Due Soon', 'yellow');
          return `<tr data-urgency="${isOverdue?'overdue':'soon'}">
            <td><strong>${m.mxg_fleet_no || '—'}</strong></td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td>${m.region || '—'}</td>
            <td style="font-weight:700;${isOverdue?'color:#b91c1c':''}">${m.cur}</td>
            <td>${m.last || '—'}</td>
            <td>500 HMR</td>
            <td>${m.next}</td>
            <td>${badge} <span style="font-size:10px;color:${isOverdue?'#b91c1c':'#a16207'};font-weight:700;">${Math.abs(Math.round(m.diff))} HMR ${isOverdue?'overdue':'remaining'}</span></td>
          </tr>`;
        }).join('');
        initRptSort('ds-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    function filterDsUrgency(val) {
      document.querySelectorAll('#ds-tbody tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const urg = row.dataset.urgency || '';
        row.classList.toggle('rpt-row-hidden', val !== '' && urg !== val);
      });
    }

    // ════════════════════════════════════════════════════════
    //  3. GENERAL DEFECTS REPORT (GDR)
    // ════════════════════════════════════════════════════════
    // Warranty pill for GDR rows
    function _gdrWtyPill(ws) {
      const w=(ws||'').toLowerCase();
      if(w.includes('under')||w==='in warranty') return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#dcfce7;color:#15803d;white-space:nowrap;">${ws}</span>`;
      if(w.includes('fringe')||w.includes('expir')) return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fef9c3;color:#a16207;white-space:nowrap;">${ws}</span>`;
      if(w.includes('out')||w.includes('expired')) return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fee2e2;color:#b91c1c;white-space:nowrap;">${ws}</span>`;
      return ws?`<span style="font-size:9px;color:#94a3b8;">${ws}</span>`:'\u2014';
    }

    async function loadRptGdr() {
      const tbody = document.getElementById('gdr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading\u2026');
      try {
        const GDR_URL = '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary';
        const res  = await callFrappe(GDR_URL, {});
        const msg  = res?.message || res || {};
        const rows = Array.isArray(msg.rows)?msg.rows:Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];

        if (!rows.length) {
          tbody.innerHTML = rptEmpty(10, 'No defects found');
          ['gdr-open','gdr-progress','gdr-closed'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=0;});
          return;
        }
        let open=0,prog=0,closed=0;
        rows.forEach(r=>{const s=(r.status||'').toLowerCase();if(s==='open')open++;else if(s==='in progress'||s==='in-progress')prog++;else if(s==='closed'||s==='resolved')closed++;});
        document.getElementById('gdr-open').textContent=open;
        document.getElementById('gdr-progress').textContent=prog;
        document.getElementById('gdr-closed').textContent=closed;

        // Keep global in sync so Machine Lookup can use fresh data
        if (typeof FT_DEFECTS_DATA !== 'undefined') window.FT_DEFECTS_DATA = rows;
        else window.FT_DEFECTS_DATA = rows;

        const priBadge=p=>{const pc=(p||'').toLowerCase();if(pc==='critical')return rptBadge(p,'red');if(pc==='high')return rptBadge(p,'yellow');if(pc==='medium')return rptBadge(p,'blue');return rptBadge(p||'Low','gray');};
        const stBadge=s=>{const sc=(s||'').toLowerCase();if(sc==='open')return rptBadge(s,'red');if(sc.includes('progress'))return rptBadge('In Progress','yellow');if(sc==='closed'||sc==='resolved')return rptBadge(s,'green');return rptBadge(s||'\u2014','gray');};

        const today=new Date();
        tbody.innerHTML=rows.map(r=>{
          const desc=r.description?r.description.slice(0,80)+(r.description.length>80?'\u2026':''):'\u2014';
          const machine=r.machine||'\u2014',cust=r.customer||'\u2014',tech=r.technician||r.oem||'\u2014';
          const dateStr=r.start_date||r.creation||null;
          const days=dateStr?Math.round((today-new Date(dateStr))/86400000):'\u2014';
          const mSafe=(r.machine||'').replace(/'/g,"\\'");
          return `<tr>
            <td style="font-family:monospace;font-size:11px;font-weight:700;">${machine}</td>
            <td>${cust}</td>
            <td>${_gdrWtyPill(r.warranty_status)}</td>
            <td title="${(r.description||'').replace(/"/g,'&quot;')}">${desc}</td>
            <td>${priBadge(r.priority||'Low')}</td>
            <td>${stBadge(r.status||'Open')}</td>
            <td>${tech}</td>
            <td>${fmtDate(dateStr)}</td>
            <td style="font-weight:700;${typeof days==='number'&&days>7?'color:#b91c1c':''}">${days}</td>
            <td style="text-align:center;"><button onclick="openDefectModal(null,'${mSafe}')" style="background:#b91c1c;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">+ Log</button></td>
          </tr>`;
        }).join('');
        initRptSort('gdr-table');
      } catch(e) {
        console.error('[GDR]',e);
        if(tbody)tbody.innerHTML=rptError(10,e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  4. SERVICE TRACKING SUMMARY (STS / STR)
    // ════════════════════════════════════════════════════════
    let _stsAllRows = [];
    let _stsSortCol = 'hrsRemaining';
    let _stsSortAsc = true;

    function sortStsTable(colKey) {
        if (_stsSortCol === colKey) {
            _stsSortAsc = !_stsSortAsc;
        } else {
            _stsSortCol = colKey;
            _stsSortAsc = true;
        }
        filterStsTable();
    }

    async function loadRptSts() {
      const tbody = document.getElementById('sts-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading">Loading…</td></tr>';
      try {
        const filters = {
          region:   document.getElementById('sts-region')?.value  || '',
          customer: document.getElementById('sts-customer')?.value || '',
          model:    document.getElementById('sts-model')?.value   || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);

        let modelsDict = {};
        try {
          const modelRes = await callFrappe(
            '/api/resource/FT%20Machine%20Model',
            { fields: '["*"]', limit_page_length: 2000 },
            'GET'
          );
          if (modelRes && modelRes.data) {
            modelRes.data.forEach(mdl => { 
              modelsDict[mdl.name] = mdl; 
              if (mdl.model) modelsDict[mdl.model] = mdl;
            });
          }
        } catch(e) { console.warn("Could not fetch machine models", e); }

        raw.forEach(m => {
          if (m.model && modelsDict[m.model]) {
            m.model_data = modelsDict[m.model];
          }
        });

        _stsAllRows = raw;

        // Populate region filter
        const regionSel = document.getElementById('sts-region');
        if (regionSel && regionSel.options.length <= 1) {
          const regions = [...new Set(raw.map(m => m.region).filter(Boolean))].sort();
          regionSel.innerHTML = '<option value="">All Regions</option>' +
            regions.map(r => `<option value="${r}">${r}</option>`).join('');
        }

        filterStsTable();
      } catch (e) {
        console.error('[STS] load error', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading" style="color:#ef4444;">Error loading data — check connection.</td></tr>';
      }
    }

    function renderStsTable(rows) {
      const tbody = document.getElementById('sts-tbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading" style="color:#94a3b8;">No machines found.</td></tr>';
        document.getElementById('sts-overdue').textContent = '0';
        document.getElementById('sts-approaching').textContent = '0';
        return;
      }
      
      const now = new Date();
      let overdueCount = 0;
      let approachingCount = 0;

      const enrichedRows = rows.map(m => {
        const mData = m.model_data || {};
        
        let mInterval = mData.si_hours || mData.service_interval_hours || m.service_interval_hours;
        if (!mInterval) mInterval = 250;
        let isType = mInterval + 'H';
        
        const currentHmr = Number(m.current_hmr || 0);
        const lastSrvHmr = Number(m.last_service_hmr || 0);
        let nextSrvHmr = Number(m.next_service_hmr || 0);
        
        if (nextSrvHmr === 0) {
            nextSrvHmr = lastSrvHmr > 0 ? (lastSrvHmr + Number(mInterval)) : Number(mInterval);
        }
        
        const hrsRemaining = nextSrvHmr - currentHmr;
        
        const lastDateVal = m.last_service_date;
        const lastServiceStr = lastDateVal ? new Date(lastDateVal.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';
        
        const lastHmrDateVal = m.last_hmr_date || m.modified;
        const lastHmrDateObj = lastHmrDateVal ? new Date(lastHmrDateVal.split(" ")[0]) : null;
        const lastHmrStr = lastHmrDateObj ? lastHmrDateObj.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';

        const daysSinceHmr = lastHmrDateObj ? Math.round((now - lastHmrDateObj) / (1000 * 60 * 60 * 24)) : 999;
        
        const isApproaching = hrsRemaining <= 50 && hrsRemaining > 0;
        const isOverdue = hrsRemaining <= 0;
        
        const maxStaleDays = isApproaching ? 1 : 5;
        const isStale = daysSinceHmr > maxStaleDays && daysSinceHmr !== 999;
        
        let estimatedHmr = currentHmr;
        let likelyOverdue = false;
        
        if (isStale) {
            let daysSinceHandover = 999;
            if (m.handover_date) {
                const hoDate = new Date(m.handover_date.split(" ")[0]);
                daysSinceHandover = Math.max(1, Math.round((now - hoDate) / 86400000));
            } else if (m.creation) {
                const crDate = new Date(m.creation.split(" ")[0]);
                daysSinceHandover = Math.max(1, Math.round((now - crDate) / 86400000));
            }
            
            const avgDailyHmr = currentHmr / daysSinceHandover;
            estimatedHmr = currentHmr + (daysSinceHmr * avgDailyHmr);
            
            if (estimatedHmr >= nextSrvHmr && !isOverdue) {
                likelyOverdue = true;
            }
        }
        
        if (isOverdue || likelyOverdue) overdueCount++;
        if (isApproaching && !likelyOverdue) approachingCount++;

        return { 
          m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, estimatedHmr, isOverdue, isApproaching
        };
      });

      document.getElementById('sts-overdue').textContent = overdueCount;
      document.getElementById('sts-approaching').textContent = approachingCount;

      enrichedRows.sort((a, b) => {
         let valA, valB;
         if (_stsSortCol === 'hrsRemaining') {
             valA = a.hrsRemaining; valB = b.hrsRemaining;
         } else if (_stsSortCol === 'hmr') {
             valA = a.currentHmr; valB = b.currentHmr;
         } else if (_stsSortCol === 'nextHmr') {
             valA = a.nextSrvHmr; valB = b.nextSrvHmr;
         } else if (_stsSortCol === 'lastUpdate') {
             valA = a.m.last_hmr_date || ''; valB = b.m.last_hmr_date || '';
         } else {
             valA = (a.m[_stsSortCol] || '').toString().toLowerCase();
             valB = (b.m[_stsSortCol] || '').toString().toLowerCase();
         }
         
         if (valA < valB) return _stsSortAsc ? -1 : 1;
         if (valA > valB) return _stsSortAsc ? 1 : -1;
         return 0;
      });

      tbody.innerHTML = enrichedRows.map(obj => {
         const { m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, isOverdue, isApproaching } = obj;
         
         let hmrDisplay = currentHmr.toLocaleString();
         let warningIcon = '';
         
         if (likelyOverdue) {
             warningIcon = `<span title="Likely Overdue: HMR is stale and estimated usage (${Math.round(obj.estimatedHmr)}h) puts it over the next service target." style="cursor:help;color:#f59e0b;font-size:14px;margin-left:4px;">⚠️</span>`;
         }
         
         let hrsColour = '#0f172a';
         if (isOverdue || likelyOverdue) hrsColour = '#ef4444';
         else if (isApproaching) hrsColour = '#f59e0b';
         
         let dateColour = isStale ? '#ef4444' : '#475569';
         let dateWarning = isStale ? `<br><span style="font-size:10px;color:#ef4444;font-weight:600;">Stale (>&nbsp;${isApproaching ? 1 : 5}d)</span>` : '';

         return `<tr>
          <td style="font-weight:600;color:#0f172a;">${m.customer || '—'}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;">${m.model || '—'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.name || '—'} | SN: ${m.sn || '—'}</div>
          </td>
          <td style="font-weight:500;">${isType}</td>
          <td style="font-weight:500;color:#0f172a;">${lastServiceStr}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a;">${hmrDisplay}${warningIcon}</td>
          <td style="text-align:right;font-weight:700;color:#475569;">${nextSrvHmr.toLocaleString()}</td>
          <td style="text-align:right;font-weight:800;color:${hrsColour};">${hrsRemaining.toLocaleString()}</td>
          <td style="color:${dateColour};font-weight:${isStale?'700':'400'};">${lastHmrStr}${dateWarning}</td>
        </tr>`;
      }).join('');
    }

    function filterStsTable() {
      const region    = (document.getElementById('sts-region')?.value    || '').toLowerCase();
      const customer  = (document.getElementById('sts-customer')?.value  || '').toLowerCase();
      const model     = (document.getElementById('sts-model')?.value     || '').toLowerCase();
      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');
      
      const filtered = _stsAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))
        );
      });
      renderStsTable(filtered);
    }

    // ════════════════════════════════════════════════════════
    //  5. WSD DAILY BREAKDOWN REPORT
    // ════════════════════════════════════════════════════════
    async function loadRptWbd() {
      const tbody = document.getElementById('wbd-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(8, 'Loading…');
      try {
        const from = document.getElementById('wbd-from')?.value || '';
        const to   = document.getElementById('wbd-to')?.value   || '';
        const res  = await callFrappe(FT_BREAKDOWN_DBR_METHOD,
          { from_date: from, to_date: to, responsibility: 'WSD' }, 'GET');
        const rows = res?.message?.breakdowns || res?.message || [];
        const data = Array.isArray(rows) ? rows : [];

        if (!data.length) { tbody.innerHTML = rptEmpty(8); return; }

        let open=0, prog=0;
        data.forEach(r => {
          const s=(r.status||'').toLowerCase();
          if (s==='open') open++;
          if (s==='in progress') prog++;
        });
        document.getElementById('wbd-open').textContent     = open;
        document.getElementById('wbd-progress').textContent = prog;
        document.getElementById('wbd-total').textContent    = data.length;

        const stBadge = s => {
          const sc=(s||'').toLowerCase();
          if (sc==='open') return rptBadge(s,'red');
          if (sc==='in progress') return rptBadge(s,'yellow');
          if (sc==='parts on order') return rptBadge(s,'blue');
          if (sc==='closed') return rptBadge(s,'green');
          return rptBadge(s,'gray');
        };
        const today = new Date();
        tbody.innerHTML = data.map(r => {
          const days = r.creation ? Math.round((today-new Date(r.creation))/86400000) : '—';
          return `<tr>
            <td>${r.customer||'—'}</td>
            <td>${r.model||'—'}</td>
            <td style="font-family:monospace;font-size:11px;">${r.machine||r.name||'—'}</td>
            <td>${r.description||'—'}</td>
            <td>${stBadge(r.status)}</td>
            <td>${r.technician||'—'}</td>
            <td>${fmtDate(r.creation)}</td>
            <td style="font-weight:700;${days>7?'color:#b91c1c':''}">${days}</td>
          </tr>`;
        }).join('');
        initRptSort('wbd-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(8, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  6. MAINTENANCE WARNING REPORT (MWR)
    // ════════════════════════════════════════════════════════
    async function loadRptMwr() {
      const tbody = document.getElementById('mwr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('mwr-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        // API returns { message: { data: [...] } } OR { message: [...] }
        const all = res?.message?.data || (Array.isArray(res?.message) ? res.message : []);

        const CRITICAL_HMR = 5000;  // HMR above which machine is in critical need of service
        const WARNING_HMR  = 2500;  // HMR above which machine needs attention

        // Show machines with high current HMR (no last_service_hmr field available)
        // OR show all machines sorted by HMR descending
        const withHmr = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)      || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            // If we have last_service_hmr, use HMR since last service
            // Otherwise use current HMR as the warning metric
            const since = last > 0 ? cur - last : cur;
            return { ...m, cur, last, since };
          })
          .filter(m => m.cur > 0)  // only machines with known HMR
          .sort((a, b) => b.since - a.since)
          .slice(0, 200);  // Top 200 by HMR/since-service

        if (!withHmr.length) {
          tbody.innerHTML = rptEmpty(9, 'No machine HMR data available');
          document.getElementById('mwr-critical').textContent = 0;
          document.getElementById('mwr-warning').textContent  = 0;
          document.getElementById('mwr-total').textContent    = 0;
          return;
        }

        let critical=0, warning=0;
        withHmr.forEach(m => {
          if (m.cur >= CRITICAL_HMR) critical++;
          else if (m.cur >= WARNING_HMR) warning++;
        });
        document.getElementById('mwr-critical').textContent = critical;
        document.getElementById('mwr-warning').textContent  = warning;
        document.getElementById('mwr-total').textContent    = withHmr.length;

        tbody.innerHTML = withHmr.map(m => {
          const isCrit  = m.cur >= CRITICAL_HMR;
          const isWarn  = m.cur >= WARNING_HMR;
          const badge   = isCrit ? rptBadge('HIGH HMR','red')
                        : isWarn ? rptBadge('MONITOR','yellow')
                        : rptBadge('OK','green');
          const sinceLabel = m.last > 0
            ? `${Math.round(m.since)} HMR since svc`
            : `${Math.round(m.cur)} HMR total`;
          return `<tr>
            <td><strong>${m.mxg_fleet_no||'—'}</strong></td>
            <td>${m.customer||'—'}</td>
            <td>${m.model||'—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
            <td>${m.region||'—'}</td>
            <td style="font-weight:700;${isCrit?'color:#b91c1c':isWarn?'color:#a16207':''}">${m.cur}</td>
            <td>${m.last > 0 ? m.last : '—'}</td>
            <td style="font-weight:600;">${sinceLabel}</td>
            <td>${badge}</td>
          </tr>`;
        }).join('');
        initRptSort('mwr-table');
      } catch(e) {
        console.error('[MWR]', e);
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  7. WEEKLY WARRANTY UPDATE (WWU)
    // ════════════════════════════════════════════════════════
    async function loadRptWwu() {
      const tbody = document.getElementById('wwu-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('wwu-region')?.value || '' };
        const res  = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        // Support both response shapes
        const all  = res?.message?.data || (Array.isArray(res?.message) ? res.message : []);
        // Show ALL machines — warranty_status may be empty string, show as 'Unknown'
        const rows = all.filter(m => m.name); // any machine with a serial number

        if (!rows.length) {
          tbody.innerHTML = rptEmpty(9, 'No machines found');
          return;
        }

        const today = new Date();
        let active=0, expired=0, expiring=0;
        rows.forEach(m => {
          const ws = (m.warranty_status||'').toLowerCase();
          if (ws === 'under warranty') {
            active++;
            const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
            if (expiry && Math.round((expiry - today) / 86400000) < 90) expiring++;
          } else if (ws === 'out of warranty') {
            expired++;
          }
        });
        document.getElementById('wwu-active').textContent   = active;
        document.getElementById('wwu-expired').textContent  = expired;
        document.getElementById('wwu-expiring').textContent = expiring;

        tbody.innerHTML = rows.map(m => {
          const ws     = (m.warranty_status || '').toLowerCase();
          const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
          const daysLeft = expiry ? Math.round((expiry - today) / 86400000) : null;

          const wBadge = ws === 'under warranty'   ? rptBadge('Under Warranty','green')
                       : ws === 'out of warranty'  ? rptBadge('Out of Warranty','red')
                       : rptBadge(m.warranty_status || 'Unknown','gray');

          const daysCell = daysLeft !== null
            ? `<span style="font-weight:700;color:${daysLeft<0?'#b91c1c':daysLeft<90?'#a16207':'#15803d'};">
                ${daysLeft<0 ? Math.abs(daysLeft)+' days ago' : daysLeft+' days'}
               </span>`
            : '<span style="color:#94a3b8;">—</span>';

          return `<tr>
            <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
            <td>${m.customer||'—'}</td>
            <td>${m.model||'—'}</td>
            <td>${m.region||'—'}</td>
            <td>${wBadge}</td>
            <td>${m.warranty_type||'—'}</td>
            <td>${fmtDate(m.commission_date)}</td>
            <td>${fmtDate(m.warranty_expiry)}</td>
            <td>${daysCell}</td>
          </tr>`;
        }).join('');
        initRptSort('wwu-table');
      } catch(e) {
        console.error('[WWU]', e);
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  END NATIVE REPORT ENGINE
    // ════════════════════════════════════════════════════════

    
    // ── Initial Service Report (ISR) ─────────────────────────────────────
    let _isrAllRows = [];
    let _isrSortCol = 'hrsRemaining'; // Default sorting
    let _isrSortAsc = true;           // Default sorting

    function sortIsrTable(colKey) {
        if (_isrSortCol === colKey) {
            _isrSortAsc = !_isrSortAsc;
        } else {
            _isrSortCol = colKey;
            _isrSortAsc = true;
        }
        filterIsrTable(); // re-evaluates the array and re-renders
    }

    async function loadRptIsr() {
      const tbody = document.getElementById('isr-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="rpt-loading">Loading…</td></tr>';
      try {
        const filters = {
          region:   document.getElementById('isr-region')?.value  || '',
          customer: document.getElementById('isr-customer')?.value || '',
          model:    document.getElementById('isr-model')?.value   || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);

        let modelsDict = {};
        try {
          const modelRes = await callFrappe(
            '/api/resource/FT%20Machine%20Model',
            { fields: '["*"]', limit_page_length: 2000 },
            'GET'
          );
          if (modelRes && modelRes.data) {
            modelRes.data.forEach(mdl => { 
              modelsDict[mdl.name] = mdl; 
              if (mdl.model) modelsDict[mdl.model] = mdl;
            });
          }
        } catch(e) { console.warn("Could not fetch machine models", e); }

        // ISR = machines where last_service_date AND last_service_hmr are both absent/zero
        const isr = raw.filter(m => {
          const noDate = !m.last_service_date || m.last_service_date === '';
          const noHmr  = !m.last_service_hmr  || Number(m.last_service_hmr) === 0;
          return noDate && noHmr;
        });

        isr.forEach(m => {
          if (m.model && modelsDict[m.model]) {
            m.model_data = modelsDict[m.model];
          }
        });

        _isrAllRows = isr;

        // Populate region filter
        const regionSel = document.getElementById('isr-region');
        if (regionSel) {
          const regions = [...new Set(isr.map(m => m.region).filter(Boolean))].sort();
          regionSel.innerHTML = '<option value="">All Regions</option>' +
            regions.map(r => `<option value="${r}">${r}</option>`).join('');
        }

        // KPIs
        const highHmr = isr.filter(m => Number(m.current_hmr) >= 500).length;
        const countEl = document.getElementById('isr-count');
        const hmrEl   = document.getElementById('isr-high-hmr');
        if (countEl) countEl.textContent = isr.length;
        if (hmrEl)   hmrEl.textContent   = highHmr;

        filterIsrTable();  // respects default Fleetrack=Yes
      } catch (e) {
        console.error('[ISR] load error', e);
        const tbody = document.getElementById('isr-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="rpt-loading" style="color:#ef4444;">Error loading data — check connection.</td></tr>';
      }
    }

    function renderIsrTable(rows) {
      const tbody = document.getElementById('isr-tbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="rpt-loading" style="color:#22c55e;">✓ All machines have a recorded last service date.</td></tr>';
        return;
      }
      // Precompute values so we can sort dynamically
      const enrichedRows = rows.map(m => {
        const hmr = Number(m.current_hmr || 0);
        const hmrColour = hmr >= 1000 ? '#ef4444' : hmr >= 500 ? '#f59e0b' : '#64748b';
        
        const mData = m.model_data || {};
        let mInterval = mData.si_hours || mData.service_interval_hours;
        
        let isType = mInterval ? mInterval + 'H' : '—';
        
        let hrsRemaining = m.hours_remaining_to_service;
        if (hrsRemaining == null && mInterval) {
           hrsRemaining = Math.max(0, parseInt(mInterval) - hmr);
        } else if (hrsRemaining == null && isType !== '—') {
           const match = isType.match(/\d+/);
           if (match) hrsRemaining = Math.max(0, parseInt(match[0]) - hmr);
        }
        hrsRemaining = hrsRemaining != null ? hrsRemaining : '—';
        const hrColour = (hrsRemaining !== '—' && hrsRemaining <= 50) ? '#ef4444' : '#0f172a';
        
        const lastDateVal = m.last_hmr_date || m.modified;
        const lastHmrDate = lastDateVal ? new Date(lastDateVal.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';

        const l_hr = mData.fuel_consumption || mData.l_hr || '—';
        const fc_cat = mData.fuel_consumption_class || '—';
        const fuelDisplay = l_hr !== '—' ? `${l_hr} L/hr <br><span style="font-size:10px;color:#64748b;">${fc_cat !== '—' ? fc_cat : ''}</span>` : '—';

        return { m, hmr, hmrColour, isType, hrsRemaining, hrColour, lastHmrDate, fuelDisplay };
      });

      // Sort by dynamically chosen column
      enrichedRows.sort((a, b) => {
         let valA, valB;
         if (_isrSortCol === 'hmr') {
             valA = a.hmr;
             valB = b.hmr;
         } else { // hrsRemaining
             valA = a.hrsRemaining === '—' ? 999999 : Number(a.hrsRemaining);
             valB = b.hrsRemaining === '—' ? 999999 : Number(b.hrsRemaining);
         }
         if (valA < valB) return _isrSortAsc ? -1 : 1;
         if (valA > valB) return _isrSortAsc ? 1 : -1;
         return 0;
      });

      tbody.innerHTML = enrichedRows.map(obj => {
         const { m, hmr, hmrColour, isType, hrsRemaining, hrColour, lastHmrDate, fuelDisplay } = obj;
         return `<tr>
          <td style="font-weight:600;color:#0f172a;">${m.customer || '—'}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;">${m.model || '—'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.name || '—'} | SN: ${m.sn || '—'}</div>
          </td>
          <td style="font-weight:500;">${isType}</td>
          <td style="font-weight:500;">${fuelDisplay}</td>
          <td style="text-align:right;font-weight:700;color:${hmrColour};">${hmr.toLocaleString()}</td>
          <td style="text-align:right;font-weight:600;color:${hrColour};">${hrsRemaining}</td>
          <td style="color:#475569;">${lastHmrDate}</td>
        </tr>`;
      }).join('');
    }

    function filterIsrTable() {
      const region    = (document.getElementById('isr-region')?.value    || '').toLowerCase();
      const customer  = (document.getElementById('isr-customer')?.value  || '').toLowerCase();
      const model     = (document.getElementById('isr-model')?.value     || '').toLowerCase();
      const minHmr    = Number(document.getElementById('isr-min-hmr')?.value || 0);
      const fleetrack = (document.getElementById('isr-fleetrack')?.value || '');
      const filtered = _isrAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))    &&
          (Number(m.current_hmr || 0) >= minHmr)
        );
      });
      renderIsrTable(filtered);
    }

    