const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ─── 1. Insert view-isr HTML before <!-- MACHINE DETAIL VIEW --> ──────────
const insertBefore = '      <!-- MACHINE DETAIL VIEW -->';
const insertIdx = c.indexOf(insertBefore);
if(insertIdx < 0){ console.log('MACHINE DETAIL VIEW marker NOT FOUND'); process.exit(1); }
console.log('Inserting ISR view at line ~'+c.substring(0,insertIdx).split('\n').length);

if(c.includes('id="view-isr"')){
  console.log('view-isr already exists — skipping HTML insert');
} else {
  const isrHtml = `      <!-- Initial Service Report (ISR) View -->
      <div id="view-isr" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--glass-border);">
            <div>
              <h2 style="font-size:22px;font-weight:800;color:var(--text-main);letter-spacing:-0.5px;">Initial Service Report <span style="color:var(--accent);">(ISR)</span></h2>
              <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Machines with no recorded last service date \u2014 require initial service.</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <div id="isr-kpi-badge" style="background:var(--accent);color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;display:none;"></div>
              <button onclick="printISR()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">\u{1F5B6} Print</button>
              <button onclick="loadISR()" style="background:var(--bg-main);border:1px solid var(--glass-border);padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text-main);">\u21BB Refresh</button>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Filter:</label>
            <select id="isr-filter-region" onchange="loadISR()" style="border:1px solid var(--glass-border);border-radius:8px;padding:6px 12px;font-size:12px;background:var(--bg-main);color:var(--text-main);">
              <option value="">All Regions</option>
              <option value="Harare">Harare</option><option value="Bulawayo">Bulawayo</option>
              <option value="Midlands">Midlands</option><option value="South">South</option>
              <option value="North">North</option><option value="East">East</option>
              <option value="West">West</option><option value="Zambia">Zambia</option>
              <option value="Mozambique">Mozambique</option>
            </select>
            <input id="isr-filter-customer" oninput="filterISRTable()" placeholder="Search customer..." style="border:1px solid var(--glass-border);border-radius:8px;padding:6px 12px;font-size:12px;background:var(--bg-main);color:var(--text-main);width:200px;" />
            <input id="isr-filter-model" oninput="filterISRTable()" placeholder="Search model / SN..." style="border:1px solid var(--glass-border);border-radius:8px;padding:6px 12px;font-size:12px;background:var(--bg-main);color:var(--text-main);width:180px;" />
          </div>
          <div id="isr-table-container">
            <div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">
              <div style="font-size:28px;margin-bottom:8px;">&#128203;</div>
              Select a region or click Refresh to load the ISR.
            </div>
          </div>
        </div>
      </div>

`;
  c = c.substring(0, insertIdx) + isrHtml + c.substring(insertIdx);
  console.log('view-isr HTML inserted');
}

// ─── 2. Add showView auto-refresh for view-isr ────────────────────────────
const svLine = "        if (viewId === 'view-machines') loadFtMachineRegister();";
if(c.includes("if (viewId === 'view-isr')")) {
  console.log('showView ISR hook already exists');
} else if(c.includes(svLine)) {
  c = c.replace(svLine, svLine + "\n        if (viewId === 'view-isr') loadISR();");
  console.log('showView ISR hook added');
} else {
  console.log('WARNING: showView line not found');
}

// ─── 3. Add ISR API constant ─────────────────────────────────────────────
const isrConst = 'const FT_ISR_METHOD =\n      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_isr";';
if(c.includes('FT_ISR_METHOD')) {
  console.log('FT_ISR_METHOD already exists');
} else {
  const constTarget = 'const FT_MACHINE_DETAIL_METHOD =';
  const ci = c.indexOf(constTarget);
  if(ci < 0){ console.log('WARNING: const target not found'); }
  else {
    c = c.substring(0,ci) + isrConst + '\n    ' + c.substring(ci);
    console.log('FT_ISR_METHOD const added');
  }
}

// ─── 4. Add ISR JS functions before printMachineRegister ─────────────────
const pmrLine = "    window.printJobCard = function(row) {";
const pmrIdx = c.indexOf(pmrLine);
if(pmrIdx < 0){ console.log('printJobCard NOT FOUND - cannot add JS'); }

if(pmrIdx >= 0 && !c.includes('window.loadISR')) {
  const isrJS = `    // ─────────────────────────────────────────────────────────────────────
    // Initial Service Report (ISR)
    // ─────────────────────────────────────────────────────────────────────
    let ISR_ROWS = [];

    window.loadISR = async function() {
      const region = document.getElementById('isr-filter-region')?.value || '';
      const container = document.getElementById('isr-table-container');
      const kpi = document.getElementById('isr-kpi-badge');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">\u23F3 Loading ISR data...</div>';
      try {
        const params = {};
        if (region) params.region = region;
        const raw = await callFrappe(window.FT_ISR_METHOD, params, 'GET', { timeout: 30000 });
        const payload = raw.message || raw;
        ISR_ROWS = payload.machines || [];
        if (kpi) {
          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' \u2014 No Service Date';
          kpi.style.display = 'block';
        }
        renderISRTable(ISR_ROWS);
      } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:13px;">\u274C Error loading ISR: ' + e.message + '</div>';
        console.error('[ISR] load error:', e);
      }
    };

    window.filterISRTable = function() {
      const custQ = (document.getElementById('isr-filter-customer')?.value || '').toLowerCase();
      const modelQ = (document.getElementById('isr-filter-model')?.value || '').toLowerCase();
      const filtered = ISR_ROWS.filter(r => {
        const custOk = !custQ || (r.customer||'').toLowerCase().includes(custQ);
        const modelOk = !modelQ || (r.model||'').toLowerCase().includes(modelQ) ||
          (r.sn||'').toLowerCase().includes(modelQ) || (r.fleet_no||'').toLowerCase().includes(modelQ);
        return custOk && modelOk;
      });
      renderISRTable(filtered);
    };

    function renderISRTable(rows) {
      const container = document.getElementById('isr-table-container');
      if (!container) return;
      if (!rows.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">\u2705 No machines without a service date for the selected filters.</div>';
        return;
      }
      const headers = ['#','CUSTOMER','MODEL','SN / FLEET NO','REGION','LOCATION','CURRENT HMR','NEXT SVC HMR','WARRANTY','LAST MODIFIED'];
      const ths = headers.map(h => '<th style="padding:9px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#fff;border-right:1px solid rgba(255,255,255,.15);">' + h + '</th>').join('');
      const trs = rows.map((r,i) => {
        const wBg = r.warranty_status && r.warranty_status.toLowerCase().includes('under')
          ? 'background:#dcfce7;color:#16a34a' : 'background:#f1f5f9;color:#64748b';
        const mod = r.modified ? r.modified.substring(0,10) : '\u2014';
        return '<tr style="border-bottom:1px solid var(--glass-border);">' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (i+1) + '</td>' +
          '<td style="padding:8px 10px;font-size:11px;font-weight:700;color:var(--text-main);">' + (r.customer||'\u2014') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;">' + (r.model||'\u2014') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (r.sn||'\u2014') + (r.fleet_no ? ' / '+r.fleet_no : '') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;">' + (r.region||'\u2014') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (r.location||'\u2014') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;text-align:right;font-weight:700;">' + (r.current_hmr != null ? Number(r.current_hmr).toFixed(0) + ' h' : '\u2014') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;text-align:right;">' + (r.next_service_hmr != null ? Number(r.next_service_hmr).toFixed(0) + ' h' : '\u2014') + '</td>' +
          '<td style="padding:8px 10px;"><span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;' + wBg + ';">' + (r.warranty_status||'\u2014') + '</span></td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + mod + '</td>' +
          '</tr>';
      }).join('');
      container.innerHTML =
        '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#f02510;">' + ths + '</tr></thead>' +
        '<tbody>' + trs + '</tbody></table>' +
        '<div style="padding:8px 4px;font-size:10px;color:var(--text-muted);text-align:right;">Showing ' + rows.length + ' machine' + (rows.length!==1?'s':'') + ' with no service date recorded.</div>';
    }

    window.printISR = function() {
      const rows = ISR_ROWS;
      if (!rows.length) { showToast('No ISR data. Load the report first.', 'warn'); return; }
      const region = document.getElementById('isr-filter-region')?.value || 'All Regions';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-ZW', {day:'2-digit',month:'short',year:'numeric'});
      const timeStr = now.toLocaleTimeString('en-ZW', {hour:'2-digit',minute:'2-digit'});
      const tbody = rows.map((r,i) => {
        const wStyle = r.warranty_status && r.warranty_status.toLowerCase().includes('under')
          ? 'background:#dcfce7;color:#16a34a' : 'background:#f1f5f9;color:#64748b';
        return '<tr style="border-bottom:1px solid #f1f5f9;">' +
          '<td style="padding:5px 6px;font-size:9px;color:#94a3b8;">' + (i+1) + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;font-weight:700;">' + (r.customer||'\u2014') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;">' + (r.model||'\u2014') + '</td>' +
          '<td style="padding:5px 6px;font-size:9px;color:#64748b;">' + (r.sn||'\u2014') + (r.fleet_no?' / '+r.fleet_no:'') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;">' + (r.region||'\u2014') + '</td>' +
          '<td style="padding:5px 6px;font-size:9px;color:#64748b;">' + (r.location||'\u2014') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;text-align:right;font-weight:700;">' + (r.current_hmr!=null?Number(r.current_hmr).toFixed(0)+' h':'\u2014') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;text-align:right;">' + (r.next_service_hmr!=null?Number(r.next_service_hmr).toFixed(0)+' h':'\u2014') + '</td>' +
          '<td style="padding:5px 6px;"><span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;' + wStyle + ';">' + (r.warranty_status||'\u2014') + '</span></td>' +
          '</tr>';
      }).join('');
      const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ISR - ' + region + '</title>' +
        '<style>*{box-sizing:border-box;margin:0;padding:0;}html,body{height:auto!important;overflow:visible!important;background:#fff;color:#0f172a;font-family:Segoe UI,Arial,sans-serif;font-size:10px;padding:12px;}' +
        '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
        '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f02510;padding-bottom:8px;margin-bottom:10px;}' +
        '.brand{font-size:20px;font-weight:900;}.brand span{color:#f02510;}' +
        '.subbrand{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;}' +
        '.rtitle{font-size:16px;font-weight:800;text-align:right;}.rtitle em{color:#f02510;font-style:normal;}' +
        '.notice{background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:10px;font-weight:600;color:#92400e;margin-bottom:10px;}' +
        'table{width:100%;border-collapse:collapse;}thead tr{background:#f02510!important;}' +
        'th{padding:7px 6px;text-align:left;color:#fff!important;font-weight:700;font-size:9px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.2);}' +
        'tbody tr:nth-child(even) td{background:#fafafa!important;}td{padding:6px;font-size:10px;vertical-align:top;border-bottom:1px solid #f1f5f9;}' +
        '.ftr{margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;}' +
        '@media print{@page{size:A4 landscape;margin:8mm;}body{padding:0;}}</style></head><body>' +
        '<div class="hdr"><div><div class="brand">OMNIS<span>.</span></div><div class="subbrand">Fleetrack \u2014 Machinery Exchange</div></div>' +
        '<div><div class="rtitle"><em>Initial</em> Service Report (ISR) \u2014 ' + region + '</div>' +
        '<div style="font-size:9px;color:#64748b;text-align:right;">Records: ' + rows.length + ' | Generated: ' + dateStr + ' ' + timeStr + '</div></div></div>' +
        '<div class="notice">\u26A0 The following ' + rows.length + ' machine' + (rows.length!==1?'s':'') + ' have NO recorded Last Service Date and require an initial service.</div>' +
        '<table><thead><tr><th>#</th><th>CUSTOMER</th><th>MODEL</th><th>SERIAL NO.</th><th>REGION</th><th>LOCATION</th><th>CURRENT HMR</th><th>NEXT SVC HMR</th><th>WARRANTY</th></tr></thead>' +
        '<tbody>' + tbody + '</tbody></table>' +
        '<div class="ftr"><span>Omnis v2 \u2014 Fleetrack</span><span>Machinery Exchange &copy; ' + now.getFullYear() + '</span><span>' + dateStr + ' ' + timeStr + '</span></div>' +
        '</body></html>';
      if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Initial Service Report (ISR) \u2014 ' + region);
      }
    };

`;
  c = c.substring(0, pmrIdx) + isrJS + c.substring(pmrIdx);
  console.log('ISR JS functions added');
}

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
