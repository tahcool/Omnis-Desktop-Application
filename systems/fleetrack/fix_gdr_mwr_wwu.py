import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── Fix loadRptGdr — use hardcoded URL and correct field names ────────────────
OLD_GDR = """    // ════════════════════════════════════════════════════════
    //  3. GENERAL DEFECTS REPORT (GDR)
    // ════════════════════════════════════════════════════════
    async function loadRptGdr() {
      const tbody = document.getElementById('gdr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(8, 'Loading…');
      try {
        const res  = await callFrappe(FT_DEFECT_SUMMARY_METHOD, {}, 'GET');
        const data = res?.message?.defects || res?.message || [];
        const rows = Array.isArray(data) ? data : [];

        if (!rows.length) { tbody.innerHTML = rptEmpty(8); return; }

        let open=0, prog=0, closed=0;
        rows.forEach(r => {
          const s = (r.status || '').toLowerCase();
          if (s === 'open') open++;
          else if (s === 'in progress') prog++;
          else if (s === 'closed' || s === 'resolved') closed++;
        });
        document.getElementById('gdr-open').textContent     = open;
        document.getElementById('gdr-progress').textContent = prog;
        document.getElementById('gdr-closed').textContent   = closed;

        const priBadge = p => {
          const pc = (p||'').toLowerCase();
          if (pc === 'critical') return rptBadge(p, 'red');
          if (pc === 'high')     return rptBadge(p, 'yellow');
          if (pc === 'medium')   return rptBadge(p, 'blue');
          return rptBadge(p || 'Low', 'gray');
        };
        const stBadge = s => {
          const sc = (s||'').toLowerCase();
          if (sc === 'open')        return rptBadge(s, 'red');
          if (sc === 'in progress') return rptBadge(s, 'yellow');
          if (sc === 'closed' || sc === 'resolved') return rptBadge(s, 'green');
          return rptBadge(s, 'gray');
        };

        const today = new Date();
        tbody.innerHTML = rows.map(r => {
          const days = r.creation ? Math.round((today - new Date(r.creation)) / 86400000) : '—';
          return `<tr>
            <td style="font-family:monospace;font-size:11px;">${r.machine || '—'}</td>
            <td>${r.customer || '—'}</td>
            <td>${r.description || r.defect_description || '—'}</td>
            <td>${priBadge(r.priority)}</td>
            <td>${stBadge(r.status)}</td>
            <td>${r.technician || '—'}</td>
            <td>${fmtDate(r.creation)}</td>
            <td style="font-weight:700;${days>7?'color:#b91c1c':''}">${days}</td>
          </tr>`;
        }).join('');
        initRptSort('gdr-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(8, e.message);
      }
    }"""

NEW_GDR = """    // ════════════════════════════════════════════════════════
    //  3. GENERAL DEFECTS REPORT (GDR)
    // ════════════════════════════════════════════════════════
    async function loadRptGdr() {
      const tbody = document.getElementById('gdr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(8, 'Loading…');
      try {
        // Hardcoded URL — FT_DEFECT_SUMMARY_METHOD lives in a different script block
        const GDR_URL = '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary';
        const res  = await callFrappe(GDR_URL, {});
        // API returns { message: { counts:{...}, rows:[...] } }
        const msg  = res?.message || res || {};
        const rows = Array.isArray(msg.rows) ? msg.rows
                   : Array.isArray(msg)      ? msg
                   : [];

        if (!rows.length) {
          tbody.innerHTML = rptEmpty(8, 'No defects found');
          document.getElementById('gdr-open').textContent = 0;
          document.getElementById('gdr-progress').textContent = 0;
          document.getElementById('gdr-closed').textContent = 0;
          return;
        }

        let open=0, prog=0, closed=0;
        rows.forEach(r => {
          const s = (r.status || '').toLowerCase();
          if (s === 'open') open++;
          else if (s === 'in progress' || s === 'in-progress') prog++;
          else if (s === 'closed' || s === 'resolved') closed++;
        });
        document.getElementById('gdr-open').textContent     = open;
        document.getElementById('gdr-progress').textContent = prog;
        document.getElementById('gdr-closed').textContent   = closed;

        const priBadge = p => {
          const pc = (p||'').toLowerCase();
          if (pc === 'critical') return rptBadge(p, 'red');
          if (pc === 'high')     return rptBadge(p, 'yellow');
          if (pc === 'medium')   return rptBadge(p, 'blue');
          return rptBadge(p || 'Low', 'gray');
        };
        const stBadge = s => {
          const sc = (s||'').toLowerCase();
          if (sc === 'open')         return rptBadge(s, 'red');
          if (sc.includes('progress')) return rptBadge('In Progress', 'yellow');
          if (sc === 'closed' || sc === 'resolved') return rptBadge(s, 'green');
          return rptBadge(s || '—', 'gray');
        };

        const today = new Date();
        tbody.innerHTML = rows.map(r => {
          // Correct field names from the existing defect view
          const desc     = r.description ? r.description.slice(0, 80) : '—';
          const machine  = r.machine    || '—';
          const customer = r.customer   || '—';
          const priority = r.priority   || 'Low';
          const status   = r.status     || 'Open';
          const tech     = r.technician || r.oem || '—';
          const dateStr  = r.start_date || r.creation || null;
          const days     = dateStr ? Math.round((today - new Date(dateStr)) / 86400000) : '—';
          return `<tr>
            <td style="font-family:monospace;font-size:11px;">${machine}</td>
            <td>${customer}</td>
            <td title="${r.description||''}">${desc}</td>
            <td>${priBadge(priority)}</td>
            <td>${stBadge(status)}</td>
            <td>${tech}</td>
            <td>${fmtDate(dateStr)}</td>
            <td style="font-weight:700;${typeof days==='number'&&days>7?'color:#b91c1c':''}">${days}</td>
          </tr>`;
        }).join('');
        initRptSort('gdr-table');
      } catch(e) {
        console.error('[GDR]', e);
        if (tbody) tbody.innerHTML = rptError(8, e.message);
      }
    }"""

if OLD_GDR in content:
    content = content.replace(OLD_GDR, NEW_GDR, 1)
    print('GDR fixed OK')
else:
    print('ERROR: GDR block not found')

# ── Fix loadRptMwr — handle missing last_service_hmr gracefully ──────────────
OLD_MWR = """    // ════════════════════════════════════════════════════════
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
        const all = res?.message?.data || [];
        const CRITICAL = 1000;
        const WARNING  = 750;

        const machines = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)     || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            const since = cur - last;
            return { ...m, cur, last, since };
          })
          .filter(m => m.since >= WARNING)
          .sort((a, b) => b.since - a.since);

        if (!machines.length) { tbody.innerHTML = rptEmpty(9, 'No maintenance warnings'); return; }

        let critical=0, warning=0;
        machines.forEach(m => { if(m.since>=CRITICAL) critical++; else warning++; });
        document.getElementById('mwr-critical').textContent = critical;
        document.getElementById('mwr-warning').textContent  = warning;
        document.getElementById('mwr-total').textContent    = machines.length;

        tbody.innerHTML = machines.map(m => {
          const isCrit = m.since >= CRITICAL;
          const badge  = isCrit ? rptBadge('CRITICAL','red') : rptBadge('WARNING','yellow');
          return `<tr>
            <td><strong>${m.mxg_fleet_no||'—'}</strong></td>
            <td>${m.customer||'—'}</td>
            <td>${m.model||'—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
            <td>${m.region||'—'}</td>
            <td style="font-weight:600;">${m.cur}</td>
            <td>${m.last||'—'}</td>
            <td style="font-weight:700;color:${isCrit?'#b91c1c':'#a16207'};">${Math.round(m.since)} HMR</td>
            <td>${badge}</td>
          </tr>`;
        }).join('');
        initRptSort('mwr-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }"""

NEW_MWR = """    // ════════════════════════════════════════════════════════
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
    }"""

if OLD_MWR in content:
    content = content.replace(OLD_MWR, NEW_MWR, 1)
    print('MWR fixed OK')
else:
    print('ERROR: MWR block not found')

# ── Fix loadRptWwu — handle all machines, show N/A gracefully ───────────────
OLD_WWU = """    // ════════════════════════════════════════════════════════
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
        const all  = res?.message?.data || [];
        const rows = all.filter(m => m.warranty_status);

        if (!rows.length) { tbody.innerHTML = rptEmpty(9); return; }

        const today = new Date();
        let active=0, expired=0, expiring=0;
        rows.forEach(m => {
          const ws = (m.warranty_status||'').toLowerCase();
          if (ws === 'under warranty') {
            active++;
            const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
            if (expiry) {
              const daysLeft = Math.round((expiry - today) / 86400000);
              if (daysLeft < 90) expiring++;
            }
          } else { expired++; }
        });
        document.getElementById('wwu-active').textContent   = active;
        document.getElementById('wwu-expired').textContent  = expired;
        document.getElementById('wwu-expiring').textContent = expiring;

        tbody.innerHTML = rows.map(m => {
          const ws = (m.warranty_status||'').toLowerCase();
          const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
          const daysLeft = expiry ? Math.round((expiry - today) / 86400000) : null;
          const wBadge = ws === 'under warranty'
            ? rptBadge('Under Warranty','green')
            : rptBadge('Out','red');
          const daysCell = daysLeft !== null
            ? `<span style="font-weight:700;color:${daysLeft<0?'#b91c1c':daysLeft<90?'#a16207':'#15803d'};">${daysLeft<0?Math.abs(daysLeft)+' days ago':daysLeft+' days'}</span>`
            : '—';
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
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }"""

NEW_WWU = """    // ════════════════════════════════════════════════════════
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
    }"""

if OLD_WWU in content:
    content = content.replace(OLD_WWU, NEW_WWU, 1)
    print('WWU fixed OK')
else:
    print('ERROR: WWU block not found')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('File saved OK')
