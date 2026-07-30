const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const containerStart = '        <!-- DASHBOARD FSP CALENDAR (';
const oldGridTag = '<div id="dash-fsp-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:auto repeat(2, minmax(160px, 1fr)); gap:16px; padding:10px 0;">';
const wrongGridTag1 = '<div id="dash-fsp-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:auto minmax(160px, 1fr); gap:16px; padding:10px 0;">';
const wrongGridTag2 = '<div id="dash-fsp-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:auto minmax(160px, 1fr); gap:24px; padding:10px 0;">';

const startIdx = html.indexOf(containerStart);
let endIdx = html.indexOf(oldGridTag, startIdx);
if (endIdx === -1) endIdx = html.indexOf(wrongGridTag1, startIdx);
if (endIdx === -1) endIdx = html.indexOf(wrongGridTag2, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  // Find the end of the grid tag
  const fullEndIdx = html.indexOf('>', endIdx) + 1;
  const chunkToReplace = html.substring(startIdx, fullEndIdx);
  
  const wowContainer = `        <!-- DASHBOARD FSP CALENDAR (1 WEEK) -->
        <div id="dashboard-fsp-container" class="hidden" style="
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        background: linear-gradient(145deg, #f8fafc 0%, #ffffff 100%);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 12px 40px -12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.6) inset;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:linear-gradient(135deg, #3b82f6, #6366f1); color:#fff; padding:4px 12px; border-radius:99px; font-weight:800; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">NEXT 7 DAYS</span>
            </div>
            <button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; font-size:12px; font-weight:800; color:#0f172a; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0';">Open Full Planner &rarr;</button>
          </div>
          <div id="dash-fsp-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:1fr; gap:24px; padding:10px 0;">`;
          
  html = html.replace(chunkToReplace, wowContainer);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log('Container patch applied successfully.');
} else {
  console.log('Could not find boundaries.', startIdx, endIdx);
}
