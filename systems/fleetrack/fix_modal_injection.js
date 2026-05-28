const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// The real </body></html> at the end of the file
const realBodyClose = c.lastIndexOf('</body>');
console.log('Real </body> at offset:', realBodyClose, 'line ~'+c.substring(0,realBodyClose).split('\n').length);
console.log('Context:', JSON.stringify(c.substring(realBodyClose-30, realBodyClose+20)));

// Verify it's the correct one (should be after the last </script>)
const lastScript = c.lastIndexOf('</script>');
console.log('Last </script> at offset:', lastScript);
if(lastScript > realBodyClose) {
  console.log('ERROR: </script> comes after </body> - wrong position!');
  process.exit(1);
}

// Remove what was incorrectly injected (the bad </body> replacement)
// The modal was injected at the WRONG </body> (inside buildReportHtml string at line ~9373)
// Find and remove the bad injection
const badInjectionStart = c.indexOf('\n  <!-- ===== REPORT PRINT PREVIEW MODAL ===== -->');
if(badInjectionStart >= 0) {
  const badInjectionEnd = c.indexOf('\n</body>', badInjectionStart);
  console.log('Bad injection at offset:', badInjectionStart, '-> ends at:', badInjectionEnd);
  
  if(badInjectionEnd >= 0 && badInjectionEnd < realBodyClose) {
    // Remove the incorrectly placed modal (up to the premature </body> which is inside a string)
    // Actually the structure is complex - let's just find what to remove
    console.log('Removing bad injection...');
    const badBlock = c.substring(badInjectionStart, badInjectionEnd + 7); // include </body>
    console.log('Bad block length:', badBlock.length);
    c = c.replace(badBlock, '\n</body>');
    console.log('Removed bad injection');
  }
}

// Now inject the modal before the REAL </body>
const modalHtml = `
  <!-- ===== REPORT PRINT PREVIEW MODAL ===== -->
  <div id="rpt-print-modal" class="hidden" style="position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.75);display:none;align-items:flex-start;justify-content:center;padding:24px;backdrop-filter:blur(4px);" onclick="if(event.target===this)window.closeReportPrintModal();">
    <div style="background:#fff;border-radius:16px;width:100%;max-width:1200px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#0f172a;border-radius:16px 16px 0 0;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:16px;">&#128438;</span>
          <div>
            <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:0.01em;" id="rpt-print-modal-title">Print Preview</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:1px;">Review your report before printing</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="window.triggerReportPrint()" style="background:#f02510;color:white;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:7px;transition:background 0.2s;" onmouseover="this.style.background='#c41e0d'" onmouseout="this.style.background='#f02510'">&#128438; Send to Printer</button>
          <button onclick="window.closeReportPrintModal()" style="background:rgba(255,255,255,0.1);color:#94a3b8;border:none;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.1)';this.style.color='#94a3b8'">&#10005; Close</button>
        </div>
      </div>
      <iframe id="rpt-print-iframe" srcdoc="" style="flex:1;border:none;width:100%;min-height:500px;background:#e5e7eb;"></iframe>
    </div>
  </div>
`;

// Insert modal before the real </body>
const realBodyClose2 = c.lastIndexOf('</body>');
c = c.substring(0, realBodyClose2) + modalHtml + '</body>' + c.substring(realBodyClose2 + 7);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
