const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const target1 = `          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:#0f172a;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:99px; font-weight:700;">NEXT 14 DAYS</span>
            </div>
            <button onclick="openFspModal()" style="background:#3b82f6; border:1px solid #2563eb; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#ffffff; cursor:pointer; margin-right: 8px;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Create Service Plan</button>
            <button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>
          </div>`;
          
const target2 = `          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:#0f172a;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:99px; font-weight:700;">NEXT 14 DAYS</span>
            </div>
            <button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>
          </div>`;

const newHeaderHtml = `          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:#0f172a;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:99px; font-weight:700;">NEXT 7 DAYS</span>
            </div>
            <button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>
          </div>`;

if (html.includes(target1)) {
  html = html.replace(target1, newHeaderHtml);
  console.log('Replaced header target1');
} else if (html.includes(target2)) {
  html = html.replace(target2, newHeaderHtml);
  console.log('Replaced header target2');
} else {
  console.log('Header target not found. Might be modified.');
}

const gridTarget = `grid-template-rows:auto repeat(2, minmax(160px, 1fr));`;
const gridReplacement = `grid-template-rows:auto minmax(160px, 1fr);`;
if (html.includes(gridTarget)) {
  html = html.replace(gridTarget, gridReplacement);
  console.log('Grid replaced');
} else {
  console.log('Grid target not found.');
}

const jsTarget = `for (let i = 0; i < 14; i++) {`;
const jsReplacement = `for (let i = 0; i < 7; i++) {`;
if (html.includes(jsTarget)) {
  html = html.replace(jsTarget, jsReplacement);
  console.log('JS 14->7 replaced');
} else {
  console.log('JS target not found.');
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Done!');
