const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8').split('\n');

const start = html.findIndex(l => l.includes('QUICK-ACTION STRIP'));
const end = html.findIndex((l, i) => i > start && l.includes('NATIVE REPORT QUICK-ACCESS'));

if (start !== -1 && end !== -1) {
  const newHTML = `        <!-- ══ QUICK-ACTION STRIP ══ -->
        <style>
          .btn-glass {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 22px;
            border: none;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            transform: translateY(0);
          }
          
          /* Blue - Create Service Booking */
          .btn-glass-blue {
            color: #ffffff;
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            box-shadow: 0 12px 30px -5px rgba(59,130,246,0.4), inset 0 0 0 1px rgba(255,255,255,0.2);
          }
          .btn-glass-blue:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -5px rgba(59,130,246,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
          }
          .btn-glass-blue:active {
            transform: translateY(0px);
            box-shadow: 0 8px 20px -5px rgba(59,130,246,0.4), inset 0 0 0 1px rgba(255,255,255,0.1);
          }

          /* Red - Log Defect */
          .btn-glass-red {
            color: #ffffff;
            background: linear-gradient(135deg, #ef4444, #b91c1c);
            box-shadow: 0 12px 30px -5px rgba(239,68,68,0.4), inset 0 0 0 1px rgba(255,255,255,0.2);
          }
          .btn-glass-red:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -5px rgba(239,68,68,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
          }
          .btn-glass-red:active {
            transform: translateY(0px);
            box-shadow: 0 8px 20px -5px rgba(239,68,68,0.4), inset 0 0 0 1px rgba(255,255,255,0.1);
          }

          /* Purple - Export Report */
          .btn-glass-purple {
            color: #ffffff;
            background: linear-gradient(135deg, #a855f7, #7c3aed);
            box-shadow: 0 12px 30px -5px rgba(139,92,246,0.4), inset 0 0 0 1px rgba(255,255,255,0.2);
          }
          .btn-glass-purple:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -5px rgba(139,92,246,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
          }
          .btn-glass-purple:active {
            transform: translateY(0px);
            box-shadow: 0 8px 20px -5px rgba(139,92,246,0.4), inset 0 0 0 1px rgba(255,255,255,0.1);
          }

          /* Navy - Update HMR / Lookup */
          .btn-glass-navy {
            color: #ffffff;
            background: linear-gradient(135deg, #334155, #0f172a);
            box-shadow: 0 12px 30px -5px rgba(15,23,42,0.4), inset 0 0 0 1px rgba(255,255,255,0.1);
          }
          .btn-glass-navy:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -5px rgba(15,23,42,0.5), inset 0 0 0 1px rgba(255,255,255,0.15);
          }
          .btn-glass-navy:active {
            transform: translateY(0px);
            box-shadow: 0 8px 20px -5px rgba(15,23,42,0.4), inset 0 0 0 1px rgba(255,255,255,0.05);
          }

          /* Green - Add Machine */
          .btn-glass-green {
            color: #ffffff;
            background: linear-gradient(135deg, #22c55e, #15803d);
            box-shadow: 0 12px 30px -5px rgba(34,197,94,0.4), inset 0 0 0 1px rgba(255,255,255,0.2);
          }
          .btn-glass-green:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -5px rgba(34,197,94,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
          }
          .btn-glass-green:active {
            transform: translateY(0px);
            box-shadow: 0 8px 20px -5px rgba(34,197,94,0.4), inset 0 0 0 1px rgba(255,255,255,0.1);
          }
        </style>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 24px; box-shadow:0 10px 30px -10px rgba(0,0,0,0.08);">
          
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, #f1f5f9, #e2e8f0); display:flex; align-items:center; justify-content:center; color:#475569; box-shadow:0 2px 6px rgba(0,0,0,0.05) inset;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style="font-size:18px; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">Shortcuts</span>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">

            <!-- Create Service Booking -->
            <button onclick="openFspModal(null)" class="btn-glass btn-glass-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Create Service Booking
            </button>

            <!-- Log Defect -->
            <button onclick="openDefectModal(null)" class="btn-glass btn-glass-red">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Log Defect
            </button>
            
            <!-- Export Report -->
            <button onclick="openReportModal()" class="btn-glass btn-glass-purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Export Report
            </button>

            <!-- Update HMR -->
            <button onclick="openQuickHmrModal()" class="btn-glass btn-glass-navy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update HMR
            </button>

            <!-- Machine Lookup -->
            <button onclick="openMachineLookup()" class="btn-glass btn-glass-navy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Lookup
            </button>

            <!-- Add Machine -->
            <button onclick="openAddMachineModal()" class="btn-glass btn-glass-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Machine
            </button>

          </div>
        </div>
`.split('\n');

  html.splice(start, end - start - 1, ...newHTML);
  fs.writeFileSync('systems/fleetrack/index.html', html.join('\n'));
  console.log('Shortcuts UI patched with Calendar Card styles successfully.');
} else {
  console.log('Failed to find bounds:', start, end);
}
