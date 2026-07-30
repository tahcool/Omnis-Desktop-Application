const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8').split('\n');

const start = html.findIndex(l => l.includes('QUICK-ACTION STRIP'));
const end = html.findIndex((l, i) => i > start && l.includes('NATIVE REPORT QUICK-ACCESS'));

if (start !== -1 && end !== -1) {
  const newHTML = `        <!-- ══ QUICK-ACTION STRIP ══ -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:99px; padding:12px 24px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#475569;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style="font-size:16px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Shortcuts</span>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">

            <!-- Create Service Booking — blue -->
            <button onclick="openFspModal(null)"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#2563eb;color:#ffffff;border:none;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.25);transition:all .2s;white-space:nowrap;"
              onmouseover="this.style.background='#1d4ed8';this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='#2563eb';this.style.transform=''">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Create Service Booking
            </button>

            <!-- Log Defect — red -->
            <button onclick="openDefectModal(null)"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#dc2626;color:#ffffff;border:none;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(220,38,38,.25);transition:all .2s;white-space:nowrap;"
              onmouseover="this.style.background='#b91c1c';this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='#dc2626';this.style.transform=''">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Log Defect
            </button>

            <!-- Update HMR — navy -->
            <button onclick="openQuickHmrModal()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#1e293b;color:#e2e8f0;border:none;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;"
              onmouseover="this.style.background='#334155';this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='#1e293b';this.style.transform=''">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update HMR
            </button>

            <!-- Machine Lookup — navy -->
            <button onclick="openMachineLookup()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#1e293b;color:#e2e8f0;border:none;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;"
              onmouseover="this.style.background='#334155';this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='#1e293b';this.style.transform=''">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Machine Lookup
            </button>

            <!-- Add Machine — green -->
            <button onclick="openAddMachineModal()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#16a34a;color:#ffffff;border:none;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(22,163,74,.25);transition:all .2s;white-space:nowrap;"
              onmouseover="this.style.background='#15803d';this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='#16a34a';this.style.transform=''">
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
