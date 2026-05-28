const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find all omnisExportPDF calls and replace with openReportPrintModal
const patterns = [
  // DBR
  ["omnisExportPDF({ htmlContent: html, filename: 'DBR-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });",
   "if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Daily Breakdown Report (DBR)'); }"],
  // MR  
  ["omnisExportPDF({ htmlContent: html, filename: 'Machine-Register-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });",
   "if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Machine Register'); }"],
  // JC
  ["omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });",
   "if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Job Card \u2014 '+(row.name||'')); }"],
  // Generic report PDF
  ["omnisExportPDF({\n        htmlContent: html,\n        filename: reportName.replace(/[^a-z0-9]/gi,'_')+'-'+new Date().toISOString().slice(0,10)+'.pdf',\n        landscape: true\n      });",
   "if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, reportName); }"],
];

patterns.forEach(([old, nw], i) => {
  // Try with \n
  let found = c.includes(old);
  // Try with \r\n
  const oldCRLF = old.replace(/\n/g, '\r\n');
  let foundCRLF = c.includes(oldCRLF);
  console.log('Pattern', i+1, '- LF:', found, 'CRLF:', foundCRLF);
  if(found) c = c.replace(old, nw);
  else if(foundCRLF) c = c.replace(oldCRLF, nw);
  else {
    // Search for partial match
    const partial = old.substring(0,60);
    const idx = c.indexOf(partial);
    if(idx>=0) {
      console.log('  Partial match at line ~'+c.substring(0,idx).split('\n').length+': '+JSON.stringify(c.substring(idx,idx+120)));
    }
  }
});

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
