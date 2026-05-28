const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: printDBR → faithful self-contained HTML template (not DOM capture)
// ─────────────────────────────────────────────────────────────────────────────
const oldDBR = `    function printDBR() {\n      const viewEl = document.getElementById('view-reports');\n      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);\n      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }\n      const html = captureStyledHTML(viewEl, 'Daily Breakdown Report (DBR)', [\n        '#btn-print-dbr','#btn-new-bd-dbr','#btn-finalize-dbr','#dbr-kpi-supervisor','.filter-bar'\n      ]);\n      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }\n    }`;

const newDBR = `    function printDBR() {
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }

      const region  = document.getElementById('dbr-filter-region')?.value || 'All';
      const prepBy  = document.getElementById('dbr-prepared-by')?.textContent || 'Omnis User';
      const dateStr = document.getElementById('dbr-date')?.textContent || new Date().toLocaleDateString('en-ZW');
      const effPct  = document.getElementById('dbr-efficiency')?.textContent || '0.0%';
      const now     = new Date();
      const timeStr = now.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });

      const badge = s => {
        if (!s) return '<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">—</span>';
        const sl = s.toLowerCase();
        if (sl.includes('open')||sl.includes('active')) return '<span style="background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('progress')||sl.includes('pending')) return '<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('hold')) return '<span style="background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('close')||sl.includes('complet')) return '<span style="background:#dcfce7;color:#16a34a;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        return '<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
      };

      const rowsHtml = rows.map(r => {
        const machineCell =
          '<strong style="display:block;font-size:10px;">'+(r.machine||r.machine_name||'—')+'</strong>'+
          (r.sn ? '<span style="font-size:8px;color:#64748b;">SN: '+r.sn+'</span><br>' : '')+
          (r.current_hmr != null ? '<span style="font-size:8px;color:#64748b;">HMR = '+r.current_hmr+'</span><br>' : '')+
          '<span style="font-size:8px;color:#64748b;">Running: '+(r.machine_running||'—')+'</span><br>'+
          '<span style="font-size:8px;color:'+(r.warranty_status && r.warranty_status.toLowerCase().includes('under') ? '#16a34a' : '#94a3b8')+';">'+
          (r.warranty_status||'—')+'</span>';
        return '<tr style="border-bottom:1px solid #f1f5f9;">'+
          '<td style="padding:7px 6px;font-weight:700;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.customer||'—')+'</td>'+
          '<td style="padding:7px 6px;vertical-align:top;min-width:120px;">'+machineCell+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.reported_on||r.start_date||'—')+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;max-width:180px;">'+(r.description||'—').substring(0,100)+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.ted||'TBA')+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.red||'—')+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;">'+badge(r.status)+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;text-align:right;font-weight:700;">'+(r.days_on_bd??'—')+'</td>'+
          '<td style="padding:7px 6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.parts_eta||'—')+'</td>'+
          '<td style="padding:7px 6px;font-size:9px;vertical-align:top;max-width:150px;color:#0ea5e9;">'+(r.manager_comments||r.comments||'').substring(0,80)+'</td>'+
          '</tr>';
      }).join('');

      const html = \`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>Daily Breakdown Report (DBR) - \${region}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; background: #fff; color: #0f172a; padding: 14px; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .rpt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 3px solid #f02510; }
  .rpt-logo { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
  .rpt-logo span { color: #f02510; }
  .rpt-subbrand { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1px; }
  .rpt-title { font-size: 18px; font-weight: 800; color: #0f172a; text-align: right; }
  .rpt-title em { color: #f02510; font-style: normal; }
  .rpt-meta { font-size: 9px; color: #64748b; text-align: right; margin-top: 3px; }
  .eff-bar { background: #0f172a; color: white; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; }
  .eff-pct { background: #f02510; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; }
  .prep-row { display: flex; gap: 24px; margin-bottom: 10px; font-size: 9px; color: #64748b; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
  .prep-row strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f02510 !important; -webkit-print-color-adjust: exact !important; }
  thead th { padding: 8px 6px; text-align: left; color: #fff !important; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; border-right: 1px solid rgba(255,255,255,0.2); }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:hover { background: #fff5f5; }
  .rpt-footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  @media print { @page { size: A4 landscape; margin: 8mm; } body { padding: 0; } }
</style>
</head><body>
<div class="rpt-header">
  <div>
    <div class="rpt-logo">OMNIS<span>.</span></div>
    <div class="rpt-subbrand">Fleetrack — Machinery Exchange</div>
  </div>
  <div>
    <div class="rpt-title"><em>Daily</em> Breakdown Report (DBR) - \${region !== 'All' ? region : 'All Regions'}</div>
    <div class="rpt-meta">Records: \${rows.length}&nbsp;&nbsp;|&nbsp;&nbsp;Generated: \${dateStr} \${timeStr}</div>
  </div>
</div>
<div class="eff-bar">
  <span>% EFFICIENCY</span>
  <span class="eff-pct">\${effPct}</span>
</div>
<div class="prep-row">
  <span><strong>PREPARED BY:</strong> \${prepBy}</span>
  <span><strong>DATE:</strong> \${dateStr}</span>
  <span><strong>REGION:</strong> \${region}</span>
</div>
<table>
  <thead><tr>
    <th>CUSTOMER</th><th>MACHINE</th><th>REPORTED ON</th>
    <th>DESCRIPTION</th><th>TED</th><th>RED</th><th>STATUS</th>
    <th style="text-align:right;">DAYS ON BD</th><th>PARTS ETA</th><th>MANAGER'S COMMENTS</th>
  </tr></thead>
  <tbody>\${rowsHtml}</tbody>
</table>
<div class="rpt-footer">
  <span>Omnis v2 — Fleetrack Dashboard</span>
  <span>Machinery Exchange &copy; \${now.getFullYear()}</span>
  <span>\${dateStr} \${timeStr}</span>
</div>
</body></html>\`;

      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR) - '+region); }
    }`;

console.log('printDBR found:', c.includes(oldDBR));
c = c.replace(oldDBR, newDBR);

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: openReportPrintModal → use buildReportHtml from data for Frappe reports
// (DOM capture is fragile; data-driven template is reliable)
// ─────────────────────────────────────────────────────────────────────────────
const oldModal = `    window.openReportPrintModal = function(customHtml, customTitle) {\n      const reportName = customTitle || window.__activeReportName || 'Report';\n      let fullHtml = customHtml || null;\n\n      if (!fullHtml) {\n        const container = document.getElementById('native-report-container');\n        const isEmpty = !container || !container.innerHTML.trim() ||\n          container.innerHTML.includes('Select your filters') ||\n          container.innerHTML.includes('Fetching data');\n        if (isEmpty) { showToast('No report data. Run the report first.', 'warn'); return; }\n        const filterBar = document.getElementById('native-report-filter-bar');\n        const filterInfo = filterBar\n          ? Array.from(filterBar.querySelectorAll('select,input'))\n              .filter(el => el.value)\n              .map(el => (el.labels && el.labels[0] ? el.labels[0].textContent : el.id) + ': ' + el.value)\n              .join('  |  ')\n          : '';\n        fullHtml = captureStyledHTML(container, reportName, ['#native-report-print-bar'], filterInfo);\n      }\n\n      const modal = document.getElementById('rpt-print-modal');\n      const iframe = document.getElementById('rpt-print-iframe');\n      const titleEl = document.getElementById('rpt-print-modal-title');\n      if (!modal || !iframe) { console.error('[Print] Modal elements missing'); return; }\n      if (titleEl) titleEl.textContent = reportName;\n      iframe.srcdoc = fullHtml;\n      modal.classList.remove('hidden');\n      modal.style.display = 'flex';\n    };`;

const newModal = `    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      let fullHtml = customHtml || null;

      // If no pre-built HTML: build from active report data
      if (!fullHtml) {
        const reportData = window.__activeReportData;
        const filters    = window.__activeReportFilters || {};
        if (!reportData || !reportData.result || !reportData.result.length) {
          showToast('No report data. Run the report first.', 'warn');
          return;
        }
        const cols = reportData.columns || [];
        const rows = reportData.result || [];
        const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';
        const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
        const trs = rows.map(row => {
          const tds = cols.map(col => {
            const key = typeof col === 'object' ? col.fieldname : col;
            let val = row[key]; if (val===null||val===undefined) val='';
            return '<td>'+String(val)+'</td>';
          }).join('');
          return '<tr>'+tds+'</tr>';
        }).join('');
        const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
        fullHtml = buildReportHtml({ title: reportName, subtitle: filterMeta, tableHtml, metaLines: ['Records: '+rows.length] });
      }

      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) { console.error('[Print] Modal elements missing'); return; }
      if (titleEl) titleEl.textContent = reportName;
      // Set srcdoc — iframe fires 'load' when done; triggerReportPrint waits for that
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };`;

console.log('openReportPrintModal found:', c.includes(oldModal));
c = c.replace(oldModal, newModal);

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: triggerReportPrint → wait for iframe load event before calling print()
// ─────────────────────────────────────────────────────────────────────────────
const oldTrigger = `    window.triggerReportPrint = function() {\n      const iframe = document.getElementById('rpt-print-iframe');\n      if (iframe && iframe.contentWindow) {\n        iframe.contentWindow.focus();\n        iframe.contentWindow.print();\n      }\n    };`;

const newTrigger = `    window.triggerReportPrint = function() {
      const iframe = document.getElementById('rpt-print-iframe');
      if (!iframe) return;

      const doPrint = () => {
        try {
          iframe.contentWindow.focus();
          setTimeout(() => {
            try { iframe.contentWindow.print(); }
            catch(e) { console.error('[Print]', e); }
          }, 400); // extra render settle time
        } catch(e) { console.error('[Print] focus failed:', e); }
      };

      // Check if iframe has already loaded its current srcdoc
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete' &&
          iframe.contentDocument.body && iframe.contentDocument.body.innerHTML.trim().length > 10) {
        doPrint();
      } else {
        // Wait for load event
        iframe.onload = () => { iframe.onload = null; doPrint(); };
      }
    };`;

console.log('triggerReportPrint found:', c.includes(oldTrigger));
c = c.replace(oldTrigger, newTrigger);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
