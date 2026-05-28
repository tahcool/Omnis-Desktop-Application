const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ── 1. Add Print PDF button to Machine Register (after New Machine button) ──
const mrOld = "             title=\"Register a new machine\">\r\n                  ➕ New Machine\r\n                </button>\r\n                <button\r\n                  onclick=\"window.openBulkHmrModal()\"";
const mrNew = "             title=\"Register a new machine\">\r\n                  ➕ New Machine\r\n                </button>\r\n                <button\r\n                  onclick=\"window.printMachineRegister()\"\r\n                  style=\"background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap;\"\r\n                  title=\"Export Machine Register as PDF\">\r\n                  🖨️ Print PDF\r\n                </button>\r\n                <button\r\n                  onclick=\"window.openBulkHmrModal()\"";
console.log('MR btn found:', c.includes(mrOld));
c = c.replace(mrOld, mrNew);

// ── 2. Update @media print CSS ──────────────────────────────────────────────
const cssOld = "      #btn-print-dbr,\r\n      .filter-bar {\r\n        display: none !important;\r\n      }";
const cssNew = "      #btn-print-dbr,\r\n      .filter-bar {\r\n        display: none !important;\r\n      }\r\n\r\n      /* Hide print buttons themselves during window.print() fallback */\r\n      [onclick*=\"printMachineRegister\"],\r\n      [onclick*=\"printJobCard\"],\r\n      [title=\"Export Machine Register as PDF\"] {\r\n        display: none !important;\r\n      }";
console.log('CSS found:', c.includes(cssOld));
c = c.replace(cssOld, cssNew);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
