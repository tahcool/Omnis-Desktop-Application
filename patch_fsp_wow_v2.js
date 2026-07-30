const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// Container
const containerOld = `        <!-- DASHBOARD FSP CALENDAR (2 WEEKS) -->
        <div id="dashboard-fsp-container" class="hidden" style="
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px; font-weight:800; color:#0f172a;">Service Tracking Timeline</span>
              <span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:99px; font-weight:700;">NEXT 14 DAYS</span>
            </div>
            <button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>
          </div>
          <div id="dash-fsp-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:auto minmax(160px, 1fr); gap:16px; padding:10px 0;">`;

const containerNew = `        <!-- DASHBOARD FSP CALENDAR (1 WEEK) -->
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

html = html.replace(containerOld, containerNew);

// Loop count from 14 to 7
html = html.replace(/for \(let i = 0; i < 14; i\+\+\)/g, 'for (let i = 0; i < 7; i++)');

const renderOld = `      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const stBg = {proposed:'#f1f5f9',planned:'#eff6ff','in progress':'#fef9c3',completed:'#dcfce7'};
      const stCol = {proposed:'#64748b',planned:'#1d4ed8','in progress':'#854d0e',completed:'#166534'};

      grid.innerHTML = '';

      // Render column headers for the 7 days of the week
      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const isToday = i === 0;
        const headerCell = document.createElement("div");
        headerCell.style.cssText = \`text-align:center; font-size:11px; font-weight:800; color:\${isToday?'#1d4ed8':'#64748b'}; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:4px;\`;
        headerCell.innerHTML = \`\${dayNames[d.getDay()]} \${isToday?'<span style="font-size:9px;background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:99px;margin-left:4px;vertical-align:middle;">TODAY</span>':''}\`;
        grid.appendChild(headerCell);
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const isToday = i === 0;
        const jobs = jobMap[key] || [];

        const cell = document.createElement("div");
        cell.style.cssText = \`background:#fff; border:1px solid \${isToday?'#bfdbfe':'#e2e8f0'}; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:6px; overflow:hidden; position:relative; box-shadow:\${isToday?'0 8px 24px rgba(59,130,246,0.12)':'0 4px 16px rgba(0,0,0,0.04)'}; cursor:pointer; transition:all 0.2s;\`;
        if(isToday) cell.style.background = '#f8fafc';
        
        cell.onmouseover = () => { cell.style.borderColor = '#93c5fd'; cell.style.transform = 'translateY(-2px)'; cell.style.boxShadow = '0 12px 24px rgba(59,130,246,0.15)'; };
        cell.onmouseout = () => { cell.style.borderColor = isToday ? '#bfdbfe' : '#e2e8f0'; cell.style.transform = 'translateY(0)'; cell.style.boxShadow = isToday ? '0 8px 24px rgba(59,130,246,0.12)' : '0 4px 16px rgba(0,0,0,0.04)'; };
        
        // Clicking cell opens new FSP modal for that day
        cell.onclick = (e) => {
          if (e.target.closest('[data-fsp-card]')) return; // Ignore clicks on existing cards
          if (typeof openFspModal === 'function') openFspModal(key);
        };

        const head = document.createElement("div");
        head.style.cssText = \`font-size:14px; font-weight:800; color:\${isToday?'#1d4ed8':'#475569'}; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid \${isToday?'#bfdbfe':'#f1f5f9'}; padding-bottom:6px; margin-bottom:4px;\`;
        head.innerHTML = \`<span>\${d.getDate()}</span>\`;
        cell.appendChild(head);

        if (!jobs.length) {
          const empty = document.createElement("div");
          empty.style.cssText = "font-size:10px; color:#cbd5e1; font-weight:600; text-align:center; padding:10px 0;";
          empty.textContent = "—";
          cell.appendChild(empty);
        } else {
          jobs.slice(0, 3).forEach(r => {
            const st = (r.status||'').toLowerCase();
            const bgC = stBg[st]||'#f1f5f9', txC = stCol[st]||'#64748b';
            const jdiv = document.createElement("div");
            window._mlookupFspRows = window._mlookupFspRows || [];
            if(!window._mlookupFspRows.includes(r)) window._mlookupFspRows.push(r);
            const idx = window._mlookupFspRows.indexOf(r);

            jdiv.dataset.fspCard = "true";
            jdiv.style.cssText = \`background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid \${txC}; border-radius:6px; padding:6px 8px; font-size:10px; cursor:pointer; transition:opacity .15s;\`;
            jdiv.onmouseover = () => jdiv.style.opacity = '.8';
            jdiv.onmouseout = () => jdiv.style.opacity = '1';
            jdiv.onclick = () => { if(typeof openFspDetailModal==='function') openFspDetailModal(window._mlookupFspRows[idx]); };

            jdiv.innerHTML = \`
              <div style="font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${r.machine||'—'}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                <span style="color:#64748b;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">\${(r.technician||'').split(' ')[0]||'TBA'}</span>
                <span style="font-size:8px;background:\${bgC};color:\${txC};padding:2px 6px;border-radius:99px;font-weight:700;">\${r.status||'—'}</span>
              </div>
            \`;
            cell.appendChild(jdiv);
          });
          if (jobs.length > 3) {
            const more = document.createElement("div");
            more.style.cssText = "font-size:9px; color:#64748b; margin-top:2px;";
            more.textContent = '+' + (jobs.length - 3) + ' more';
            cell.appendChild(more);
          }
        }
        grid.appendChild(cell);
      }
    }`;

const renderNew = `      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      // Modern styling tokens
      const stBg = {proposed:'#f8fafc',planned:'#eff6ff','in progress':'#fef9c3',completed:'#dcfce7'};
      const stCol = {proposed:'#64748b',planned:'#3b82f6','in progress':'#d97706',completed:'#10b981'};

      grid.innerHTML = '';

      // Render column headers for the 7 days of the week
      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const isToday = i === 0;
        const headerCell = document.createElement("div");
        headerCell.style.cssText = \`text-align:center; font-size:11px; font-weight:800; color:\${isToday?'#3b82f6':'#94a3b8'}; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px;\`;
        headerCell.innerHTML = \`\${dayNames[d.getDay()]} \${isToday?'<span style="font-size:9px;background:linear-gradient(135deg, #3b82f6, #4f46e5);color:#fff;padding:2px 8px;border-radius:99px;margin-left:6px;vertical-align:middle;box-shadow:0 2px 8px rgba(59,130,246,0.3);">TODAY</span>':''}\`;
        grid.appendChild(headerCell);
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const isToday = i === 0;
        const jobs = jobMap[key] || [];
        const hasJobs = jobs.length > 0;

        const cell = document.createElement("div");
        
        // Wow styling for cell
        const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#ffffff';
        const baseBorder = isToday ? 'transparent' : (hasJobs ? 'rgba(226,232,240,0.8)' : 'rgba(226,232,240,0.4)');
        const baseShadow = isToday ? '0 12px 30px -5px rgba(59,130,246,0.4), 0 0 0 1px rgba(255,255,255,0.2) inset' : (hasJobs ? '0 8px 24px -8px rgba(0,0,0,0.06)' : 'none');
        const hoverShadow = isToday ? '0 20px 40px -5px rgba(59,130,246,0.5), 0 0 0 1px rgba(255,255,255,0.3) inset' : '0 16px 32px -8px rgba(0,0,0,0.1)';
        const hoverTransform = 'translateY(-4px)';
        const opacityStr = (!isToday && !hasJobs) ? 'opacity:0.7;' : '';

        cell.style.cssText = \`background:\${baseBg}; border:1px solid \${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:\${baseShadow}; \${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;\`;
        
        cell.onmouseover = () => { cell.style.transform = hoverTransform; cell.style.boxShadow = hoverShadow; if(!isToday) cell.style.borderColor = '#cbd5e1'; };
        cell.onmouseout = () => { cell.style.transform = 'translateY(0)'; cell.style.boxShadow = baseShadow; if(!isToday) cell.style.borderColor = baseBorder; };
        
        // Background Watermark Date
        const watermark = document.createElement("div");
        watermark.style.cssText = \`position:absolute; right:-10px; bottom:-15px; font-size:110px; font-weight:900; line-height:1; letter-spacing:-6px; color:\${isToday?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.02)'}; pointer-events:none; z-index:0; transition:color 0.3s;\`;
        watermark.textContent = d.getDate();
        cell.appendChild(watermark);

        cell.onclick = (e) => {
          if (e.target.closest('[data-fsp-card]')) return;
          if (typeof openFspModal === 'function') openFspModal(key);
        };

        const head = document.createElement("div");
        head.style.cssText = \`font-size:16px; font-weight:900; color:\${isToday?'#ffffff':'#1e293b'}; display:flex; justify-content:space-between; align-items:center; z-index:1; position:relative; margin-bottom: 8px;\`;
        head.innerHTML = \`<span>\${d.getDate()} \${dayNames[d.getDay()]}</span>\`;
        cell.appendChild(head);

        // Content Area z-index wrapper
        const contentArea = document.createElement("div");
        contentArea.style.cssText = "display:flex; flex-direction:column; gap:10px; z-index:1; position:relative; flex:1;";
        
        if (!jobs.length) {
          const empty = document.createElement("div");
          empty.style.cssText = \`font-size:12px; color:\${isToday?'rgba(255,255,255,0.7)':'#cbd5e1'}; font-weight:600; padding-top:12px; display:flex; align-items:center; gap:6px;\`;
          empty.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> No jobs scheduled\`;
          contentArea.appendChild(empty);
        } else {
          jobs.slice(0, 3).forEach(r => {
            const st = (r.status||'').toLowerCase();
            const bgC = stBg[st]||'#f1f5f9', txC = stCol[st]||'#64748b';
            const jdiv = document.createElement("div");
            
            window._mlookupFspRows = window._mlookupFspRows || [];
            if(!window._mlookupFspRows.includes(r)) window._mlookupFspRows.push(r);
            const idx = window._mlookupFspRows.indexOf(r);

            jdiv.dataset.fspCard = "true";
            
            if (isToday) {
               // Glassmorphic dark card for today
               jdiv.style.cssText = \`background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(8px); border-radius:12px; padding:12px; font-size:11px; cursor:pointer; transition:all .2s; box-shadow:0 4px 12px rgba(0,0,0,0.1);\`;
               jdiv.onmouseover = () => { jdiv.style.background = 'rgba(255,255,255,0.25)'; jdiv.style.transform = 'translateY(-1px)'; };
               jdiv.onmouseout = () => { jdiv.style.background = 'rgba(255,255,255,0.15)'; jdiv.style.transform = 'translateY(0)'; };
               
               jdiv.innerHTML = \`
                <div style="font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px; font-size: 13px;">\${r.machine||'—'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                  <span style="color:rgba(255,255,255,0.9);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">\${(r.technician||'').split(' ')[0]||'TBA'}</span>
                  <span style="font-size:9px;background:\${txC};color:#fff;padding:2px 8px;border-radius:99px;font-weight:800;letter-spacing:0.3px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">\${r.status||'—'}</span>
                </div>
              \`;
            } else {
               // Premium light card for future days
               jdiv.style.cssText = \`background:#ffffff; border:1px solid rgba(226,232,240,0.8); border-left:4px solid \${txC}; border-radius:12px; padding:12px; font-size:11px; cursor:pointer; transition:all .2s; box-shadow:0 2px 6px -2px rgba(0,0,0,0.05);\`;
               jdiv.onmouseover = () => { jdiv.style.boxShadow = '0 6px 14px -4px rgba(0,0,0,0.08)'; jdiv.style.transform = 'translateY(-1px)'; jdiv.style.borderColor = '#cbd5e1'; };
               jdiv.onmouseout = () => { jdiv.style.boxShadow = '0 2px 6px -2px rgba(0,0,0,0.05)'; jdiv.style.transform = 'translateY(0)'; jdiv.style.borderColor = 'rgba(226,232,240,0.8)'; };
               
               jdiv.innerHTML = \`
                <div style="font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px; font-size: 13px;">\${r.machine||'—'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                  <span style="color:#475569;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">\${(r.technician||'').split(' ')[0]||'TBA'}</span>
                  <span style="font-size:9px;background:\${bgC};color:\${txC};padding:2px 8px;border-radius:99px;font-weight:800;letter-spacing:0.3px;">\${r.status||'—'}</span>
                </div>
              \`;
            }

            jdiv.onclick = () => { if(typeof openFspDetailModal==='function') openFspDetailModal(window._mlookupFspRows[idx]); };
            contentArea.appendChild(jdiv);
          });
          if(jobs.length > 3) {
            const more = document.createElement("div");
            more.style.cssText = \`font-size:10px; color:\${isToday?'rgba(255,255,255,0.9)':'#64748b'}; margin-top:4px; font-weight:800; text-align:center; background:\${isToday?'rgba(255,255,255,0.1)':'#f1f5f9'}; border-radius:99px; padding:4px 0;\`;
            more.textContent = '+' + (jobs.length - 3) + ' more jobs';
            contentArea.appendChild(more);
          }
        }
        
        cell.appendChild(contentArea);
        grid.appendChild(cell);
      }
    }`;

if (html.includes(renderOld)) {
  html = html.replace(renderOld, renderNew);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log('Wow effect applied!');
} else {
  console.log('renderOld not found');
}
