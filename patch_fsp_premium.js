const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Upgrade the Container
const containerTarget = `        <!-- DASHBOARD FSP CALENDAR (1 WEEK) -->
        <div id="dashboard-fsp-container" class="hidden" style="
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        ">`;
const containerReplacement = `        <!-- DASHBOARD FSP CALENDAR (1 WEEK PREMIUM) -->
        <div id="dashboard-fsp-container" class="hidden" style="
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        background: linear-gradient(145deg, #ffffff, #f8fafc);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
        ">`;

if (html.includes(containerTarget)) {
  html = html.replace(containerTarget, containerReplacement);
}

// 2. Upgrade Header Badges
const headerTarget = `<span style="font-size:16px; font-weight:800; color:#0f172a;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:99px; font-weight:700;">NEXT 7 DAYS</span>`;
const headerReplacement = `<span style="font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:linear-gradient(135deg, #eff6ff, #dbeafe); color:#1d4ed8; padding:4px 10px; border-radius:99px; font-weight:800; border: 1px solid #bfdbfe; box-shadow: 0 2px 4px rgba(29,78,216,0.05);">NEXT 7 DAYS</span>`;
if (html.includes(headerTarget)) {
  html = html.replace(headerTarget, headerReplacement);
}

// 3. Upgrade Grid Button
const btnTarget = `<button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>`;
const btnReplacement = `<button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; font-size:12px; font-weight:700; color:#334155; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s ease;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fff'; this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)';">Open Planner &rarr;</button>`;
if (html.includes(btnTarget)) {
  html = html.replace(btnTarget, btnReplacement);
}

// 4. Upgrade the Cells inside renderDashboardFsp
const jsCellTarget = `const cell = document.createElement("div");
        cell.style.cssText = \`background:#fff; border:1px solid \${isToday?'#bfdbfe':'#e2e8f0'}; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:6px; overflow:hidden; position:relative; box-shadow:\${isToday?'0 8px 24px rgba(59,130,246,0.12)':'0 4px 16px rgba(0,0,0,0.04)'}; cursor:pointer; transition:all 0.2s;\`;
        if(isToday) cell.style.background = '#f8fafc';
        
        cell.onmouseover = () => { cell.style.borderColor = '#93c5fd'; cell.style.transform = 'translateY(-2px)'; cell.style.boxShadow = '0 12px 24px rgba(59,130,246,0.15)'; };
        cell.onmouseout = () => { cell.style.borderColor = isToday ? '#bfdbfe' : '#e2e8f0'; cell.style.transform = 'translateY(0)'; cell.style.boxShadow = isToday ? '0 8px 24px rgba(59,130,246,0.12)' : '0 4px 16px rgba(0,0,0,0.04)'; };`;

const jsCellReplacement = `const cell = document.createElement("div");
        cell.style.cssText = \`background:#fff; border:1px solid \${isToday?'rgba(59,130,246,0.4)':'rgba(226,232,240,0.8)'}; border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:\${isToday?'0 10px 25px -5px rgba(59,130,246,0.15), 0 0 0 1px rgba(59,130,246,0.1) inset':'0 4px 20px -2px rgba(0,0,0,0.03)'}; cursor:pointer; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\`;
        if(isToday) cell.style.background = 'linear-gradient(145deg, #ffffff, #eff6ff)';
        
        cell.onmouseover = () => { cell.style.borderColor = isToday ? '#60a5fa' : '#cbd5e1'; cell.style.transform = 'translateY(-3px)'; cell.style.boxShadow = isToday ? '0 15px 35px -5px rgba(59,130,246,0.2)' : '0 12px 30px -5px rgba(0,0,0,0.08)'; };
        cell.onmouseout = () => { cell.style.borderColor = isToday ? 'rgba(59,130,246,0.4)' : 'rgba(226,232,240,0.8)'; cell.style.transform = 'translateY(0)'; cell.style.boxShadow = isToday ? '0 10px 25px -5px rgba(59,130,246,0.15), 0 0 0 1px rgba(59,130,246,0.1) inset' : '0 4px 20px -2px rgba(0,0,0,0.03)'; };`;

if (html.includes(jsCellTarget)) {
  html = html.replace(jsCellTarget, jsCellReplacement);
}

// 5. Upgrade the pills
const jsPillTarget = `const pill = document.createElement('div');
                  const c = colorFor(job.status);
                  pill.style.cssText = 'background:' + c + '22; border-left:2px solid ' + c + '; padding:2px 5px; border-radius:0 3px 3px 0; margin-bottom:2px; font-size:10px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';`;

const jsPillReplacement = `const pill = document.createElement('div');
                  const c = colorFor(job.status);
                  pill.style.cssText = 'background: linear-gradient(90deg, ' + c + '15, transparent); border-left:3px solid ' + c + '; padding:4px 8px; border-radius:4px 8px 8px 4px; margin-bottom:4px; font-size:11px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:background 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);';`;

if (html.includes(jsPillTarget)) {
  html = html.replace(jsPillTarget, jsPillReplacement);
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Premium patch applied successfully!');
