const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// When openFrappeReport is called, hide the print bar and reset state
const old = "      const container = document.getElementById(\"native-report-container\");\r\n      const filterBar = document.getElementById(\"native-report-filter-bar\");\r\n      \r\n      container.innerHTML = '<div style=\"padding: 40px; text-align: center; color: #64748b;\">Loading report module...</div>';\r\n      filterBar.innerHTML = '';";

const nw = "      const container = document.getElementById(\"native-report-container\");\r\n      const filterBar = document.getElementById(\"native-report-filter-bar\");\r\n      \r\n      container.innerHTML = '<div style=\"padding: 40px; text-align: center; color: #64748b;\">Loading report module...</div>';\r\n      filterBar.innerHTML = '';\r\n\r\n      // Hide print bar on new report load\r\n      const _pb = document.getElementById('native-report-print-bar');\r\n      if (_pb) _pb.style.display = 'none';\r\n      window.__activeReportName = reportNameStr;\r\n      window.__activeReportData = null;";

console.log('found:', c.includes(old));
c = c.replace(old, nw);

// Also add print bar reveal + state set for isDynamicFallback path
const oldDyn = "            if (isDynamicFallback) {\r\n                container.innerHTML = rawHtml;\r\n            } else {";
const newDyn = "            if (isDynamicFallback) {\r\n                container.innerHTML = rawHtml;\r\n                // Store state for dynamic fallback path too\r\n                window.__activeReportName = reportNameStr;\r\n                window.__activeReportData = rawData.message;\r\n                window.__activeReportFilters = filters;\r\n                const _pb2 = document.getElementById('native-report-print-bar');\r\n                if (_pb2) _pb2.style.display = 'flex';\r\n                const _ce2 = document.getElementById('native-report-row-count');\r\n                const _rc2 = rawData.message && rawData.message.result ? rawData.message.result.length : 0;\r\n                if (_ce2) _ce2.textContent = _rc2 + ' records';\r\n            } else {";

console.log('dyn found:', c.includes(oldDyn));
c = c.replace(oldDyn, newDyn);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
