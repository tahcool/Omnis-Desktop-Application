const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Update printDBR to use modal instead of bare omnisExportPDF (keep omnisExportPDF for now but also open modal)
// The DBR Print PDF button - change it to open modal
const old1 = <div id="btn-print-dbr" onclick="printDBR()" aria-label="Print Report as PDF"
                style="background:var(--bg-main);border:1px solid var(--border-color);color:var(--text-main);padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;">
                <span>???</span>
                <span>Print PDF</span>
              </div>;
const new1 = <div id="btn-print-dbr" onclick="printDBR()" aria-label="Print Report"
                style="background:#0f172a;color:white;border:none;padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#0f172a'">
                <span>??</span>
                <span>Print</span>
              </div>;
console.log('DBR btn found:', c.includes(old1));
c = c.replace(old1, new1);

// Update printDBR function to open the modal instead of calling omnisExportPDF
const oldDBRend =       omnisExportPDF({ htmlContent: html, filename: 'DBR-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });
    };
const newDBRend =       // Open print preview modal instead of saving PDF directly
      if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)');
      }
    };
console.log('DBR end found:', c.includes(oldDBRend));
c = c.replace(oldDBRend, newDBRend);

// Update printMachineRegister to use modal
const oldMRend =       omnisExportPDF({ htmlContent: html, filename: 'Machine-Register-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });
    };;
const newMRend =       if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Machine Register');
      }
    };;
console.log('MR end found:', c.includes(oldMRend));
c = c.replace(oldMRend, newMRend);

// Update printJobCard to use modal
const oldJCend =       omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });
    };;
const newJCend =       if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Job Card — '+(row.name||''));
      }
    };;
console.log('JC end found:', c.includes(oldJCend));
c = c.replace(oldJCend, newJCend);

// Also update the JC table row print button (currently calls printJobCard(j))
// Keep as is - printJobCard calls the modal now

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
