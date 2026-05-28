const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ── Fix printDBR to use DOM capture ──────────────────────────────────────────
// Find the exact end of printDBR function
const dbrStart = c.indexOf('    function printDBR() {\r\n');
const dbrEnd = c.indexOf('\r\n    }\r\n\r\n    window.printMachineRegister');
console.log('DBR function found:', dbrStart>0 && dbrEnd>0, 'start line ~'+c.substring(0,dbrStart).split('\n').length);

if(dbrStart>0 && dbrEnd>0) {
  const oldDBR = c.substring(dbrStart, dbrEnd+3); // include \r\n    }
  const newDBR = `    function printDBR() {
      const viewEl = document.getElementById('view-reports');
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }
      const html = captureStyledHTML(viewEl, 'Daily Breakdown Report (DBR)', [
        '#btn-print-dbr','#btn-new-bd-dbr','#btn-finalize-dbr','#dbr-kpi-supervisor','.filter-bar'
      ]);
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }
    }`;
  c = c.substring(0, dbrStart) + newDBR + c.substring(dbrStart + oldDBR.length);
  console.log('DBR replaced');
}

// ── Fix printMachineRegister to use DOM capture ───────────────────────────────
const mrStart = c.indexOf('    window.printMachineRegister = function() {\r\n');
const mrEnd = c.indexOf('\r\n    };\r\n\r\n    window.printJobCard');
console.log('MR function found:', mrStart>0 && mrEnd>0);

if(mrStart>0 && mrEnd>0) {
  const oldMR = c.substring(mrStart, mrEnd+5); // include \r\n    };
  const newMR = `    window.printMachineRegister = function() {
      const rows = window.FT_MACHINE_ROWS || [];
      if (!rows.length) { showToast('Machine register not loaded.', 'warn'); return; }
      const viewEl = document.getElementById('view-machines');
      if (!viewEl) { showToast('Machine view not found.', 'warn'); return; }
      const html = captureStyledHTML(viewEl, 'Machine Register', [
        '[onclick*="printMachineRegister"]','.filter-bar','#btn-primary-action'
      ]);
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Machine Register'); }
    };`;
  c = c.substring(0, mrStart) + newMR + c.substring(mrStart + oldMR.length);
  console.log('MR replaced');
}

// ── Fix openReportPrintModal to use DOM capture when no customHtml ───────────
const modalStart = c.indexOf('    window.openReportPrintModal = function(customHtml, customTitle) {\n');
console.log('Modal fn found:', modalStart>0, 'line ~'+c.substring(0,modalStart).split('\n').length);

if(modalStart>0) {
  // Find end of this function - look for "    };\n\n    window.closeReportPrintModal"
  const modalEnd = c.indexOf('    };\n\n    window.closeReportPrintModal');
  const modalEndFull = c.indexOf('    };\n\n    window.closeReportPrintModal');
  console.log('Modal end:', modalEnd>0);
  
  if(modalEnd>0) {
    const oldModal = c.substring(modalStart, modalEnd+6); // include     };
    const newModal = `    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      let fullHtml = customHtml || null;

      // If no custom HTML, capture the Frappe native-report-container DOM
      if (!fullHtml) {
        const container = document.getElementById('native-report-container');
        if (!container || !container.innerHTML.trim() || container.innerHTML.includes('Select your filters')) {
          showToast('No report data. Run the report first.', 'warn');
          return;
        }
        const filterBar = document.getElementById('native-report-filter-bar');
        const filterInfo = filterBar ? filterBar.innerText.replace(/\\s+/g,' ').trim() : '';
        fullHtml = captureStyledHTML(container, reportName, ['#native-report-print-bar'], filterInfo);
      }

      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) { console.error('Print modal not found'); return; }
      if (titleEl) titleEl.textContent = reportName;
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };`;
    c = c.substring(0, modalStart) + newModal + c.substring(modalStart + oldModal.length);
    console.log('Modal replaced');
  }
}

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
