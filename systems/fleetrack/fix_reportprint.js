const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Store current report data on window for print access
//    Find the end of runNativeReport where container.innerHTML is set
// ─────────────────────────────────────────────────────────────────────────────
const oldRunEnd = `            if (isDynamicFallback) {
                container.innerHTML = rawHtml;
            } else {
                const context = {
                    data: rawData.message.result,
                    filters: filters,
                    frappe: {
                        user_info: () => ({ fullname: "Omnis User" }),
                        datetime: { now_date: () => new Date() }
                    }
                };
                
                const renderedHtml = renderMicroTemplate(rawHtml, context);
                container.innerHTML = renderedHtml;
            }
            
        } catch(err) {
            console.error("Native report error", err);
            container.innerHTML = \`<div style="color: red; padding: 20px; font-weight: 600;">Failed to run report: \${err.message}</div>\`;
        }
    }`;

const newRunEnd = `            if (isDynamicFallback) {
                container.innerHTML = rawHtml;
            } else {
                const context = {
                    data: rawData.message.result,
                    filters: filters,
                    frappe: {
                        user_info: () => ({ fullname: "Omnis User" }),
                        datetime: { now_date: () => new Date() }
                    }
                };
                
                const renderedHtml = renderMicroTemplate(rawHtml, context);
                container.innerHTML = renderedHtml;
            }

            // Store report state for print functions
            window.__activeReportName = reportNameStr;
            window.__activeReportData = rawData.message;
            window.__activeReportFilters = filters;

            // Show print actions after data loads
            const printBar = document.getElementById('native-report-print-bar');
            if (printBar) printBar.style.display = 'flex';
            
        } catch(err) {
            console.error("Native report error", err);
            container.innerHTML = \`<div style="color: red; padding: 20px; font-weight: 600;">Failed to run report: \${err.message}</div>\`;
        }
    }`;

console.log('runNativeReport end found:', c.includes(oldRunEnd));
c = c.replace(oldRunEnd, newRunEnd);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Add a universal print bar to view-frappe-report panel
//    Insert AFTER native-report-container opening div
// ─────────────────────────────────────────────────────────────────────────────
const oldPanel = `        <div id="native-report-container" style="flex: 1; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow-y: auto;">`;
const newPanel = `        <!-- Universal Report Print Bar -->
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

        <div id="native-report-container" style="flex: 1; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow-y: auto;">`;

console.log('panel found:', c.includes(oldPanel));
c = c.replace(oldPanel, newPanel);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
