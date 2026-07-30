const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8').split('\n');

const start = html.findIndex(l => l.includes('QUICK-ACTION STRIP'));
const end = html.findIndex((l, i) => i > start && l.includes('NATIVE REPORT QUICK-ACCESS'));

if (start !== -1 && end !== -1) {
  const newHTML = `        <!-- ══ QUICK-ACTION STRIP ══ -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 24px; box-shadow:0 10px 30px -10px rgba(0,0,0,0.08);">
          
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, #f1f5f9, #e2e8f0); display:flex; align-items:center; justify-content:center; color:#475569; box-shadow:0 2px 6px rgba(0,0,0,0.05) inset;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">Shortcuts</span>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">

            <!-- Create Service Booking — blue -->
            <button onclick="openFspModal(null)"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:#2563eb;color:#ffffff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.25);transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;"
              onmouseover="this.style.background='#1d4ed8';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(37,99,235,.35)';"
              onmouseout="this.style.background='#2563eb';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(37,99,235,.25)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Create Service Booking
            </button>

            <!-- Log Defect — red -->
            <button onclick="openDefectModal(null)"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:#dc2626;color:#ffffff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,.25);transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;"
              onmouseover="this.style.background='#b91c1c';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(220,38,38,.35)';"
              onmouseout="this.style.background='#dc2626';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(220,38,38,.25)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Log Defect
            </button>
            
            <!-- Generate Report — premium purple gradient -->
            <button onclick="showView('view-rpt-aftersales')"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:linear-gradient(135deg, #a855f7, #7c3aed);color:#ffffff;border:1px solid rgba(255,255,255,0.1);border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(139,92,246,.3);transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(139,92,246,.4)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(139,92,246,.3)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Export Report
            </button>

            <!-- Update HMR — navy -->
            <button onclick="openQuickHmrModal()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:#1e293b;color:#f8fafc;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.1);"
              onmouseover="this.style.background='#334155';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 14px rgba(0,0,0,0.15)';"
              onmouseout="this.style.background='#1e293b';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 10px rgba(0,0,0,0.1)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update HMR
            </button>

            <!-- Machine Lookup — navy -->
            <button onclick="openMachineLookup()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:#1e293b;color:#f8fafc;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.1);"
              onmouseover="this.style.background='#334155';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 14px rgba(0,0,0,0.15)';"
              onmouseout="this.style.background='#1e293b';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 10px rgba(0,0,0,0.1)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Lookup
            </button>

            <!-- Add Machine — green -->
            <button onclick="openAddMachineModal()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;background:#16a34a;color:#ffffff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(22,163,74,.25);transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;"
              onmouseover="this.style.background='#15803d';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(22,163,74,.35)';"
              onmouseout="this.style.background='#16a34a';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(22,163,74,.25)';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Machine
            </button>

          </div>
        </div>
`.split('\n');

  html.splice(start, end - start - 1, ...newHTML);
  fs.writeFileSync('systems/fleetrack/index.html', html.join('\n'));
  console.log('Shortcuts UI patched successfully.');
} else {
  console.log('Failed to find bounds:', start, end);
}
