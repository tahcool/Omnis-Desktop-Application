const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// 1. Update DBR print button style
const old1 = `id="btn-print-dbr" onclick="printDBR()" aria-label="Print Report as PDF"\r\n                style="background:var(--bg-main);border:1px solid var(--border-color);color:var(--text-main);padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;">\r\n                <span>🖨️</span>\r\n                <span>Print PDF</span>`;
const new1 = `id="btn-print-dbr" onclick="printDBR()" aria-label="Print Report"\r\n                style="background:#0f172a;color:white;border:none;padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#0f172a'">\r\n                <span>🖶</span>\r\n                <span>Print</span>`;
console.log('DBR btn:', c.includes(old1));
c = c.replace(old1, new1);

// 2. printDBR -> use modal
const oldDBRend = "      omnisExportPDF({ htmlContent: html, filename: 'DBR-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });\n    }";
const newDBRend = "      if (typeof window.openReportPrintModal === 'function') {\n        window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)');\n      }\n    }";
console.log('DBR omnisExportPDF:', c.includes(oldDBRend));
c = c.replace(oldDBRend, newDBRend);

// 3. printMachineRegister -> use modal
const oldMR = "      omnisExportPDF({ htmlContent: html, filename: 'Machine-Register-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });\n    };";
const newMR = "      if (typeof window.openReportPrintModal === 'function') {\n        window.openReportPrintModal(html, 'Machine Register');\n      }\n    };";
console.log('MR omnisExportPDF:', c.includes(oldMR));
c = c.replace(oldMR, newMR);

// 4. printJobCard -> use modal
const oldJC = "      omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });\n    };";
const newJC = "      if (typeof window.openReportPrintModal === 'function') {\n        window.openReportPrintModal(html, 'Job Card \u2014 '+(row.name||''));\n      }\n    };";
console.log('JC omnisExportPDF:', c.includes(oldJC));
c = c.replace(oldJC, newJC);

// 5. printCurrentReportPDF uses omnisExportPDF - change to modal too
const oldPDF = "      omnisExportPDF({\n        htmlContent: html,\n        filename: reportName.replace(/[^a-z0-9]/gi,'_')+'-'+new Date().toISOString().slice(0,10)+'.pdf',\n        landscape: true\n      });";
const newPDF = "      if (typeof window.openReportPrintModal === 'function') {\n        window.openReportPrintModal(html, reportName);\n      }";
console.log('PDF omnisExportPDF:', c.includes(oldPDF));
c = c.replace(oldPDF, newPDF);

// 6. Also update Machine Register Print PDF button label
const oldMRbtn = "title=\"Export Machine Register as PDF\">\r\n                  🖨️ Print PDF";
const newMRbtn = "title=\"Print Machine Register\">\r\n                  🖶 Print";
console.log('MR btn:', c.includes(oldMRbtn));
c = c.replace(oldMRbtn, newMRbtn);

// 7. JC modal print button is already updated from earlier

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
