const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ── 1. Remove the separate print bar div entirely ──────────────────────────
const oldPrintBar = `        <!-- Universal Report Print Bar -->
        <div id="native-report-print-bar" style="display:none; background:white; padding:10px 16px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.06); align-items:center; gap:10px; flex-wrap:wrap; border:1px solid #e5e7f0;">
          <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Export:</span>
          <button onclick="printCurrentReportPDF()" style="background:#0f172a;color:white;border:none;padding:7px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
            🖨️ Save as PDF
          </button>
          <button onclick="printCurrentReportPrinter()" style="background:white;color:#0f172a;border:1px solid #e2e8f0;padding:7px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
            🖶 Print to Printer
          </button>
          <span id="native-report-row-count" style="margin-left:auto;font-size:11px;color:#94a3b8;"></span>
        </div>

`;

console.log('print bar found:', c.includes(oldPrintBar));
c = c.replace(oldPrintBar, '');

// ── 2. Inject print buttons into the filter bar AFTER "Run Report" ──────────
// Current pattern: the Run Report button is the last thing added to filterHtml
const oldRunBtn = `filterHtml += \`<button onclick="runNativeReport('\${encodedReportName}', '\${folderName}')" style="padding: 8px 16px; background: #be185d; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(190,24,93,0.3); transition: background 0.2s;" onmouseover="this.style.background='#9d174d'" onmouseout="this.style.background='#be185d'">Run Report</button>\`;
          filterBar.innerHTML = filterHtml;`;

const newRunBtn = `filterHtml += \`<button onclick="runNativeReport('\${encodedReportName}', '\${folderName}')" style="padding: 8px 16px; background: #be185d; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(190,24,93,0.3); transition: background 0.2s;" onmouseover="this.style.background='#9d174d'" onmouseout="this.style.background='#be185d'">Run Report</button>\`;
          // Print buttons — inline with filters, hidden until data loads
          filterHtml += \`<div id="native-report-print-bar" style="display:none; align-items:center; gap:8px; margin-left:auto; border-left:1px solid #e2e8f0; padding-left:12px;">
            <button onclick="printCurrentReportPDF()" style="background:#0f172a;color:white;border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">
              🖨️ Save as PDF
            </button>
            <button onclick="printCurrentReportPrinter()" style="background:white;color:#0f172a;border:1px solid #cbd5e1;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">
              🖶 Print to Printer
            </button>
            <span id="native-report-row-count" style="font-size:11px;color:#94a3b8;white-space:nowrap;"></span>
          </div>\`;
          filterBar.innerHTML = filterHtml;`;

console.log('Run Report filterHtml line found:', c.includes(oldRunBtn));
c = c.replace(oldRunBtn, newRunBtn);

// ── 3. Fix all references to native-report-print-bar show/hide ──────────────
// Since the bar is now injected dynamically via filterHtml, the document.getElementById 
// references after runNativeReport are still correct (the div will exist in filterBar).
// But we need to change display from 'flex' to 'flex' — keep them, they'll work.
// Just ensure the bar uses display:flex when shown (not display:block)

// All the existing _pb.style.display = 'flex' and _pb2.style.display = 'flex' are correct
// The bar starts as display:none and we show it with display:flex = inline-flex works too

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
