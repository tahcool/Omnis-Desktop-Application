const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find the exact end of the Run Report button line and filterBar.innerHTML = filterHtml;
const old = "onmouseover=\\\"this.style.background='#9d174d'\\\" onmouseout=\\\"this.style.background='#be185d'\\\"\u003eRun Report\u003c/button\u003e`;\r\n          filterBar.innerHTML = filterHtml;";

// That's encoded. Let's find the raw string
const rawSearch = "onmouseout=\"this.style.background='#be185d'\">Run Report</button>`;\r\n          filterBar.innerHTML = filterHtml;";
console.log('found raw:', c.includes(rawSearch));

const rawNew = `onmouseout="this.style.background='#be185d'">Run Report</button>
          <div id="native-report-print-bar" style="display:none;align-items:center;gap:8px;margin-left:auto;border-left:2px solid #e2e8f0;padding-left:14px;">
            <button onclick="printCurrentReportPDF()" style="background:#0f172a;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">🖨️ Save as PDF</button>
            <button onclick="printCurrentReportPrinter()" style="background:white;color:#0f172a;border:1px solid #cbd5e1;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">🖶 Print to Printer</button>
            <span id="native-report-row-count" style="font-size:11px;color:#94a3b8;white-space:nowrap;padding-left:4px;"></span>
          </div>\`;
          filterBar.innerHTML = filterHtml;`;

c = c.replace(rawSearch, rawNew);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
