const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find the exact boundaries of the corrupted section
// Start: "    function printDBR() {\n"  (the new version added by fix_dom_capture2.js)
// End: "    window.printCurrentReportPrinter = window.openReportPrintModal;\r\n"

const secStart = c.indexOf('    function printDBR() {\n      const viewEl = document.getElementById');
const secEnd_marker = "    window.printCurrentReportPrinter = window.openReportPrintModal;";
const secEnd = c.indexOf(secEnd_marker);

if(secStart < 0) { console.log('Start NOT found'); process.exit(1); }
if(secEnd < 0) { console.log('End NOT found'); process.exit(1); }

console.log('Section start at line ~'+c.substring(0,secStart).split('\n').length);
console.log('Section end at line ~'+c.substring(0,secEnd).split('\n').length);

// Get what comes after the end marker
const afterEnd = c.indexOf('\r\n\r\n    // ---------------------------', secEnd);
if(afterEnd < 0) { console.log('After-end NOT found'); }
console.log('After-end at line ~'+c.substring(0,afterEnd).split('\n').length);

const cleanSection = `    function printDBR() {
      const viewEl = document.getElementById('view-reports');
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }
      const html = captureStyledHTML(viewEl, 'Daily Breakdown Report (DBR)', [
        '#btn-print-dbr','#btn-new-bd-dbr','#btn-finalize-dbr','#dbr-kpi-supervisor','.filter-bar'
      ]);
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }
    }

    window.printMachineRegister = function() {
      const rows = window.FT_MACHINE_ROWS || [];
      if (!rows.length) { showToast('Machine register not loaded.', 'warn'); return; }
      const viewEl = document.getElementById('view-machines');
      if (!viewEl) { showToast('Machine view not found.', 'warn'); return; }
      const html = captureStyledHTML(viewEl, 'Machine Register', [
        '[onclick*="printMachineRegister"]','.filter-bar','#btn-primary-action'
      ]);
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Machine Register'); }
    };

    window.printJobCard = function(row) {
      if (!row) { showToast('No job card data.', 'warn'); return; }
      // For job cards, use the branded buildReportHtml since it's structured data
      const f = (label, val) => val
        ? '<tr><td style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;padding:5px 8px;width:130px;">'+label+'</td><td style="padding:5px 8px;">'+val+'</td></tr>'
        : '';
      const sB = s => {
        if (!s) return '—';
        const sl = s.toLowerCase();
        if (sl.includes('open')||sl.includes('active')) return '<span class="br">'+s+'</span>';
        if (sl.includes('progress')) return '<span class="ba">'+s+'</span>';
        if (sl.includes('complet')||sl.includes('close')) return '<span class="bg">'+s+'</span>';
        return '<span class="bz">'+s+'</span>';
      };
      const tableHtml =
        '<table style="margin-bottom:16px;"><thead><tr><th colspan="2">Job Card Details</th></tr></thead><tbody>'+
        f('Job Card ID',row.name)+f('Customer',row.customer)+
        f('Machine / SN',row.machine||row.machine_name)+f('Model',row.model)+
        f('Technician',row.technician||row.assigned_to)+f('Status',sB(row.status))+
        f('Start Date',row.start_date)+f('End Date',row.end_date)+f('Current HMR',row.current_hmr)+
        f('Description',(row.description||'').substring(0,300))+
        f('Parts Required',row.parts_required)+
        f('Notes',(row.technician_notes||row.comments||'').substring(0,300))+
        '</tbody></table>'+
        '<table><thead><tr><th colspan="2">Authorisation</th></tr></thead><tbody>'+
        '<tr><td colspan="2" style="padding:20px 8px;color:#64748b;font-size:9px;text-align:center;">'+
        'Customer Signature: _________________________  Technician Signature: _________________________  Date: _____________'+
        '</td></tr></tbody></table>';
      const html = buildReportHtml({
        title: 'Job Card — '+(row.name||''),
        subtitle: 'Customer: '+(row.customer||'—')+' | Machine: '+(row.machine||row.machine_name||'—'),
        tableHtml,
        metaLines: ['Status: '+(row.status||'—')+' | Technician: '+(row.technician||row.assigned_to||'—')]
      });
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Job Card — '+(row.name||'')); }
    };

    // ----------------------------------------------------------
    // 📄 printCurrentReportPDF() — routes to modal
    // ----------------------------------------------------------
    window.printCurrentReportPDF = function() {
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(); }
    };

    // ----------------------------------------------------------
    // 🖶 openReportPrintModal() — In-app Print Preview Modal
    // ----------------------------------------------------------
    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      let fullHtml = customHtml || null;

      if (!fullHtml) {
        const container = document.getElementById('native-report-container');
        const isEmpty = !container || !container.innerHTML.trim() ||
          container.innerHTML.includes('Select your filters') ||
          container.innerHTML.includes('Fetching data');
        if (isEmpty) { showToast('No report data. Run the report first.', 'warn'); return; }
        const filterBar = document.getElementById('native-report-filter-bar');
        const filterInfo = filterBar
          ? Array.from(filterBar.querySelectorAll('select,input'))
              .filter(el => el.value)
              .map(el => (el.labels && el.labels[0] ? el.labels[0].textContent : el.id) + ': ' + el.value)
              .join('  |  ')
          : '';
        fullHtml = captureStyledHTML(container, reportName, ['#native-report-print-bar'], filterInfo);
      }

      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) { console.error('[Print] Modal elements missing'); return; }
      if (titleEl) titleEl.textContent = reportName;
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };

    window.closeReportPrintModal = function() {
      const modal = document.getElementById('rpt-print-modal');
      if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
    };

    window.triggerReportPrint = function() {
      const iframe = document.getElementById('rpt-print-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    };

    window.printCurrentReportPrinter = window.openReportPrintModal;`;

c = c.substring(0, secStart) + cleanSection + c.substring(afterEnd);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
