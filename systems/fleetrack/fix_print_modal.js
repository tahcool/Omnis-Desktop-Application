const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Update the filter bar injection — remove PDF button, keep one Print button
// ─────────────────────────────────────────────────────────────────────────────
const oldBtns = `          <div id="native-report-print-bar" style="display:none;align-items:center;gap:8px;margin-left:auto;border-left:2px solid #e2e8f0;padding-left:14px;">
            <button onclick="printCurrentReportPDF()" style="background:#0f172a;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">🖨️ Save as PDF</button>
            <button onclick="printCurrentReportPrinter()" style="background:white;color:#0f172a;border:1px solid #cbd5e1;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">🖶 Print to Printer</button>
            <span id="native-report-row-count" style="font-size:11px;color:#94a3b8;white-space:nowrap;padding-left:4px;"></span>
          </div>`;

const newBtns = `          <div id="native-report-print-bar" style="display:none;align-items:center;gap:8px;margin-left:auto;border-left:2px solid #e2e8f0;padding-left:14px;">
            <button onclick="openReportPrintModal()" style="background:#0f172a;color:white;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#0f172a'">🖶 Print</button>
            <span id="native-report-row-count" style="font-size:11px;color:#94a3b8;white-space:nowrap;padding-left:4px;"></span>
          </div>`;

console.log('btns found:', c.includes(oldBtns));
c = c.replace(oldBtns, newBtns);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Replace printCurrentReportPrinter with openReportPrintModal
// ─────────────────────────────────────────────────────────────────────────────
const oldPrinterFn = `    // ----------------------------------------------------------
    // 🖶 printCurrentReportPrinter() — Print to Physical Printer
    // ----------------------------------------------------------
    window.printCurrentReportPrinter = function() {
      const reportName = window.__activeReportName || 'Report';
      const reportData = window.__activeReportData;
      const filters   = window.__activeReportFilters || {};

      if (!reportData || !reportData.result || !reportData.result.length) {
        showToast('No report data to print. Run the report first.', 'warn');
        return;
      }

      const cols = reportData.columns || [];
      const rows = reportData.result || [];
      const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';

      const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
      const trs = rows.map(row => {
        const tds = cols.map(col => {
          const key = typeof col === 'object' ? col.fieldname : col;
          let val = row[key]; if (val===null||val===undefined) val='';
          return '<td>'+String(val)+'</td>';
        }).join('');
        return '<tr>'+tds+'</tr>';
      }).join('');

      const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
      const fullHtml = buildReportHtml({ title: reportName, subtitle: filterMeta, tableHtml, metaLines: ['Records: '+rows.length] });

      // Open print-only window — browser/system print dialog appears
      const pw = window.open('', '_blank', 'width=1100,height=800');
      if (pw) {
        pw.document.write(fullHtml);
        pw.document.close();
        pw.focus();
        setTimeout(() => { pw.print(); }, 700);
      } else {
        showToast('Could not open print window. Check popup blocker.', 'warn');
      }
    };

    // ---------------------------
    //`;

const newPrinterFn = `    // ----------------------------------------------------------
    // 🖶 openReportPrintModal() — In-app Print Preview Modal
    // ----------------------------------------------------------
    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      const reportData = window.__activeReportData;
      const filters    = window.__activeReportFilters || {};

      let fullHtml = customHtml || null;

      if (!fullHtml) {
        if (!reportData || !reportData.result || !reportData.result.length) {
          showToast('No report data. Run the report first.', 'warn');
          return;
        }
        const cols = reportData.columns || [];
        const rows = reportData.result || [];
        const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';
        const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
        const trs = rows.map(row => {
          const tds = cols.map(col => {
            const key = typeof col === 'object' ? col.fieldname : col;
            let val = row[key]; if (val===null||val===undefined) val='';
            return '<td>'+String(val)+'</td>';
          }).join('');
          return '<tr>'+tds+'</tr>';
        }).join('');
        const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
        fullHtml = buildReportHtml({ title: reportName, subtitle: filterMeta, tableHtml, metaLines: ['Records: '+rows.length] });
      }

      // Load into modal iframe
      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) return;

      if (titleEl) titleEl.textContent = reportName;

      // Write HTML into iframe srcdoc
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };

    window.closeReportPrintModal = function() {
      const modal = document.getElementById('rpt-print-modal');
      if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
    };

    window.triggerReportPrint = function() {
      const iframe = document.getElementById('rpt-print-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    };

    // Keep printCurrentReportPrinter as alias for compatibility
    window.printCurrentReportPrinter = window.openReportPrintModal;

    // ---------------------------
    //`;

console.log('printer fn found:', c.includes(oldPrinterFn));
c = c.replace(oldPrinterFn, newPrinterFn);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Inject Print Preview Modal HTML before </body>
// ─────────────────────────────────────────────────────────────────────────────
const modalHtml = `
  <!-- ===== REPORT PRINT PREVIEW MODAL ===== -->
  <div id="rpt-print-modal" class="hidden" style="
    position:fixed; inset:0; z-index:99999;
    background:rgba(15,23,42,0.75);
    display:none; align-items:flex-start; justify-content:center;
    padding:24px;
    backdrop-filter:blur(4px);
  " onclick="if(event.target===this)window.closeReportPrintModal();">
    <div style="
      background:#fff; border-radius:16px; width:100%; max-width:1200px;
      max-height:calc(100vh - 48px); display:flex; flex-direction:column;
      box-shadow:0 25px 60px rgba(0,0,0,0.4); overflow:hidden;
    ">
      <!-- Modal header bar -->
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 20px; background:#0f172a; border-radius:16px 16px 0 0;
        flex-shrink:0;
      ">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:16px;">🖶</span>
          <div>
            <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:0.01em;" id="rpt-print-modal-title">Print Preview</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:1px;">Review your report before printing</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="window.triggerReportPrint()"
            style="background:#f02510;color:white;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:7px;transition:background 0.2s;"
            onmouseover="this.style.background='#c41e0d'" onmouseout="this.style.background='#f02510'">
            🖶 Send to Printer
          </button>
          <button onclick="window.closeReportPrintModal()"
            style="background:rgba(255,255,255,0.1);color:#94a3b8;border:none;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.background='rgba(255,255,255,0.2)';this.style.color='#fff'"
            onmouseout="this.style.background='rgba(255,255,255,0.1)';this.style.color='#94a3b8'">
            ✕ Close
          </button>
        </div>
      </div>
      <!-- Iframe preview area -->
      <iframe id="rpt-print-iframe" srcdoc="" style="
        flex:1; border:none; width:100%; min-height:0;
        background:#e5e7eb;
      "></iframe>
    </div>
  </div>

</body>`;

console.log('</body> found:', c.includes('</body>'));
c = c.replace('</body>', modalHtml);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
