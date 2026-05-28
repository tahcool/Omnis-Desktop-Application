const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Replace printDBR — capture the actual rendered #view-reports DOM
// ─────────────────────────────────────────────────────────────────────────────
const oldDBR = `    function printDBR() {
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data to export. Load the report first.', 'warn'); return; }
      const regionF = document.getElementById('dbr-filter-region')?.value || 'All';
      const custF   = document.getElementById('dbr-filter-customer')?.value || '';
      const respF   = document.getElementById('dbr-filter-responsibility')?.value || 'All';
      const badge = s => {
        if (!s) return '<span class="bz">—</span>';
        const sl = s.toLowerCase();
        if (sl.includes('open')||sl.includes('active')) return '<span class="br">'+s+'</span>';
        if (sl.includes('progress')||sl.includes('pending')) return '<span class="ba">'+s+'</span>';
        if (sl.includes('close')||sl.includes('complet')) return '<span class="bg">'+s+'</span>';
        return '<span class="bz">'+s+'</span>';
      };
      const rowsHtml = rows.map(r =>
        '<tr><td><strong>'+(r.customer||'—')+'</strong></td>'+
        '<td>'+(r.machine||r.machine_name||'—')+'</td>'+
        '<td>'+(r.reported_on||r.start_date||'—')+'</td>'+
        '<td style="max-width:190px;">'+(r.description||'—').substring(0,80)+'</td>'+
        '<td>'+(r.ted||'—')+'</td><td>'+(r.red||'—')+'</td>'+
        '<td>'+badge(r.status)+'</td>'+
        '<td style="text-align:right;">'+(r.days_on_bd??'—')+'</td>'+
        '<td>'+(r.parts_eta||'—')+'</td>'+
        '<td style="font-size:9px;">'+(r.manager_comments||r.comments||'').substring(0,60)+'</td></tr>'
      ).join('');
      const tableHtml = '<table><thead><tr><th>Customer</th><th>Machine</th><th>Reported On</th>'+
        '<th>Description</th><th>TED</th><th>RED</th><th>Status</th>'+
        '<th>Days BD</th><th>Parts ETA</th><th>Comments</th></tr></thead><tbody>'+rowsHtml+'</tbody></table>';
      const html = buildReportHtml({
        title: 'Daily Breakdown Report (DBR)',
        subtitle: 'Prepared by System | '+new Date().toLocaleDateString('en-ZW'),
        tableHtml,
        metaLines: ['Region: '+regionF+(custF?' | Customer: '+custF:''), 'Responsibility: '+respF+' | Records: '+rows.length]
      });
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }
    }`;

const newDBR = `    function printDBR() {
      const viewEl = document.getElementById('view-reports');
      if (!viewEl) { showToast('DBR view not found.', 'warn'); return; }
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }
      const html = captureStyledHTML(viewEl, 'Daily Breakdown Report (DBR)', [
        '#btn-print-dbr','#btn-new-bd-dbr','#btn-finalize-dbr','#dbr-kpi-supervisor',
        '.filter-bar','.top-nav','.sidebar','.topbar','.main-header-row','#btn-primary-action'
      ]);
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }
    }`;

console.log('printDBR found:', c.includes(oldDBR));
c = c.replace(oldDBR, newDBR);

// ─────────────────────────────────────────────────────────────────────────────
// Replace printMachineRegister — capture the actual #view-machines DOM
// ─────────────────────────────────────────────────────────────────────────────
const oldMR = `    window.printMachineRegister = function() {
      const rows = window.FT_MACHINE_ROWS || [];
      if (!rows.length) { showToast('Machine register not loaded. Navigate to Machines first.', 'warn'); return; }
      const byRegion = {};
      rows.forEach(m => { const r = m.region||'Unassigned'; if (!byRegion[r]) byRegion[r]=[]; byRegion[r].push(m); });
      const wb = ws => {
        if (!ws) return '<span class="bz">—</span>';
        const l = ws.toLowerCase();
        if (l.includes('active')||l.includes('working')) return '<span class="bg">'+ws+'</span>';
        if (l.includes('idle')) return '<span class="ba">'+ws+'</span>';
        if (l.includes('broken')||l.includes('down')) return '<span class="br">'+ws+'</span>';
        return '<span class="bz">'+ws+'</span>';
      };
      let tbody = ''; let n = 1;
      Object.entries(byRegion).sort().forEach(([region, ms]) => {
        tbody += '<tr class="section-header"><td colspan="8">📍 '+region+' — '+ms.length+' machines</td></tr>';
        ms.sort((a,b)=>(a.customer||'').localeCompare(b.customer||'')).forEach(m => {
          tbody += '<tr><td style="color:#94a3b8;">'+(n++)+'</td><td><strong>'+(m.name||'—')+'</strong></td>'+
            '<td>'+(m.model||'—')+'</td><td>'+(m.customer||'—')+'</td>'+
            '<td>'+(m.location||m.current_location||'—')+'</td>'+
            '<td style="text-align:right;font-weight:700;">'+(m.current_hmr??'—')+'</td>'+
            '<td style="text-align:right;">'+(m.next_service_hmr??'—')+'</td>'+
            '<td>'+wb(m.working_status)+'</td></tr>';
        });
      });
      const tableHtml = '<table><thead><tr><th>#</th><th>Machine (SN)</th><th>Model</th>'+
        '<th>Customer</th><th>Location</th><th>HMR</th><th>Next Service</th><th>Status</th>'+
        '</tr></thead><tbody>'+tbody+'</tbody></table>';
      const html = buildReportHtml({
        title: 'Machine Register', subtitle: 'Full fleet grouped by region', tableHtml,
        metaLines: ['Total: '+rows.length+' machines | Regions: '+Object.keys(byRegion).length]
      });
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Machine Register'); }
    };`;

const newMR = `    window.printMachineRegister = function() {
      const rows = window.FT_MACHINE_ROWS || [];
      if (!rows.length) { showToast('Machine register not loaded. Navigate to Machines first.', 'warn'); return; }
      const viewEl = document.getElementById('view-machines');
      if (viewEl) {
        const html = captureStyledHTML(viewEl, 'Machine Register', [
          '[onclick*="printMachineRegister"]','#btn-primary-action',
          '.filter-bar','.top-nav','.sidebar','.topbar'
        ]);
        if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Machine Register'); }
      } else {
        showToast('Machine view not found.', 'warn');
      }
    };`;

console.log('printMachineRegister found:', c.includes(oldMR));
c = c.replace(oldMR, newMR);

// ─────────────────────────────────────────────────────────────────────────────
// Replace openReportPrintModal to use DOM capture for Frappe reports
// ─────────────────────────────────────────────────────────────────────────────
const oldModal = `    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      const reportData = window.__activeReportData;
      const filters    = window.__activeReportFilters || {};

      let fullHtml = customHtml || null;

      if (!fullHtml) {
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

      // Load into modal iframe
      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) return;

      if (titleEl) titleEl.textContent = reportName;

      // Write HTML into iframe srcdoc
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };`;

const newModal = `    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      let fullHtml = customHtml || null;

      // If no custom HTML provided, capture the Frappe native-report-container
      if (!fullHtml) {
        const container = document.getElementById('native-report-container');
        if (!container || !container.innerHTML.trim() || container.innerHTML.includes('Select your filters')) {
          showToast('No report data. Run the report first.', 'warn');
          return;
        }
        // Build a styled capture of just the report container content
        const filterBar = document.getElementById('native-report-filter-bar');
        const filterInfo = filterBar ? filterBar.innerText.replace(/\\s+/g,' ').trim() : '';
        fullHtml = captureStyledHTML(container, reportName, [], filterInfo);
      }

      // Load into modal iframe
      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) { console.error('Print modal elements not found'); return; }

      if (titleEl) titleEl.textContent = reportName;
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };`;

console.log('openReportPrintModal found:', c.includes(oldModal));
c = c.replace(oldModal, newModal);

// ─────────────────────────────────────────────────────────────────────────────
// Add captureStyledHTML() helper BEFORE buildReportHtml
// ─────────────────────────────────────────────────────────────────────────────
const beforeBuildReport = `    function buildReportHtml({ title, subtitle, tableHtml, metaLines }) {`;
const withCaptureHelper = `    // ─────────────────────────────────────────────────────────────────────
    // captureStyledHTML — Serialize a live DOM node as a printable HTML doc
    // Params: el (DOM element), title (string), hideSelectors (array of CSS selectors to hide)
    // ─────────────────────────────────────────────────────────────────────
    function captureStyledHTML(el, title, hideSelectors, subtitle) {
      // Collect all <style> tag content from the page
      const allStyles = Array.from(document.querySelectorAll('style'))
        .map(s => s.textContent || '')
        .join('\\n');

      // Build CSS to hide non-print elements
      const hideCSS = (hideSelectors || []).map(sel => sel + ' { display: none !important; }').join('\\n');

      // Get a snapshot clone so we can manipulate it without affecting the page
      const clone = el.cloneNode(true);

      // Remove any elements that should be hidden in print
      (hideSelectors || []).forEach(sel => {
        try { clone.querySelectorAll(sel).forEach(n => n.remove()); } catch(_) {}
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-ZW', { day:'2-digit', month:'short', year:'numeric' });
      const timeStr = now.toLocaleTimeString('en-ZW', { hour:'2-digit', minute:'2-digit' });

      return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>\${title || 'Report'}</title>
  <style>
    /* Base reset for print */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0; padding: 16px;
      background: white; color: #0f172a;
    }
    /* Ensure backgrounds & colors print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /* Remove fixed/sticky positioning */
    .top-nav, .sidebar, .topbar, .modal-overlay, .toast-container,
    [class*="overlay"], [class*="modal"]:not(.rpt-capture) { display: none !important; }
    /* Make scrollable areas visible */
    * { overflow: visible !important; }
    /* Print header strip */
    .rpt-capture-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 12px; padding-bottom: 10px;
      border-bottom: 3px solid #f02510;
    }
    .rpt-capture-title { font-size: 18px; font-weight: 800; color: #0f172a; }
    .rpt-capture-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
    .rpt-capture-meta { text-align: right; font-size: 10px; color: #94a3b8; }
    .rpt-capture-footer {
      margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between;
      font-size: 9px; color: #94a3b8;
    }
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      body { padding: 0; }
    }
    /* Page styles from the app */
    \${allStyles}
    /* Hide non-print elements */
    \${hideCSS}
    /* Button cleanup in print */
    button, [onclick*="print"], [onclick*="Print"],
    #btn-print-dbr, #btn-new-bd-dbr, #btn-finalize-dbr,
    .filter-bar, #native-report-print-bar { display: none !important; }
  </style>
</head>
<body>
  <div class="rpt-capture-header">
    <div>
      <div class="rpt-capture-title">\${title || 'Report'}</div>
      \${subtitle ? '<div class="rpt-capture-sub">'+subtitle+'</div>' : ''}
    </div>
    <div class="rpt-capture-meta">
      <div>Omnis · Fleetrack</div>
      <div>\${dateStr} \${timeStr}</div>
    </div>
  </div>
  \${clone.innerHTML}
  <div class="rpt-capture-footer">
    <span>Omnis v2 — Fleetrack Dashboard</span>
    <span>Machinery Exchange &copy; \${now.getFullYear()}</span>
    <span>\${dateStr} \${timeStr}</span>
  </div>
</body>
</html>\`;
    }

    function buildReportHtml({ title, subtitle, tableHtml, metaLines }) {`;

console.log('buildReportHtml anchor found:', c.includes(beforeBuildReport));
c = c.replace(beforeBuildReport, withCaptureHelper);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
