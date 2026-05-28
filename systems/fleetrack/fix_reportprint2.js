const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

const old = "                const renderedHtml = renderMicroTemplate(rawHtml, context);\r\n                container.innerHTML = renderedHtml;\r\n            }\r\n            \r\n        } catch(err) {\r\n            console.error(\"Native report error\", err);\r\n            container.innerHTML = `<div style=\"color: red; padding: 20px; font-weight: 600;\">Failed to run report: ${err.message}</div>`;\r\n        }\r\n    }\r\n";

const nw = "                const renderedHtml = renderMicroTemplate(rawHtml, context);\r\n                container.innerHTML = renderedHtml;\r\n            }\r\n\r\n            // Store report state for universal print functions\r\n            window.__activeReportName = reportNameStr;\r\n            window.__activeReportData = rawData.message;\r\n            window.__activeReportFilters = filters;\r\n\r\n            // Show print bar and update record count\r\n            const printBar = document.getElementById('native-report-print-bar');\r\n            if (printBar) printBar.style.display = 'flex';\r\n            const countEl = document.getElementById('native-report-row-count');\r\n            const rowCount = (rawData.message && rawData.message.result) ? rawData.message.result.length : 0;\r\n            if (countEl) countEl.textContent = rowCount + ' records';\r\n\r\n        } catch(err) {\r\n            console.error(\"Native report error\", err);\r\n            container.innerHTML = `<div style=\"color: red; padding: 20px; font-weight: 600;\">Failed to run report: ${err.message}</div>`;\r\n        }\r\n    }\r\n";

console.log('Found:', c.includes(old));
c = c.replace(old, nw);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
