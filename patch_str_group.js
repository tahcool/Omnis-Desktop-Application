const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Add Group toggle in filter bar
const filterClearBtnHTML = `<div style="display:flex;align-items:flex-end;">
            <button class="rpt-action-btn" onclick="document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;filterStsTable()">Clear</button>`;

const newFilterClearBtnHTML = `          <div class="rpt-filter-group" style="flex:0 0 auto;">
            <label>Group View</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;height:38px;padding:0 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;font-size:13px;color:#475569;user-select:none;">
              <input type="checkbox" id="sts-group-customer" onchange="filterStsTable()" style="cursor:pointer;width:16px;height:16px;accent-color:#ef4444;margin:0;">
              By Customer
            </label>
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button class="rpt-action-btn" onclick="document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;filterStsTable()">Clear</button>`;

if (html.includes('<div style="display:flex;align-items:flex-end;">\n            <button class="rpt-action-btn" onclick="document.getElementById(\'sts-region\').value=\'\';document.getElementById(\'sts-customer\').value=\'\';document.getElementById(\'sts-model\').value=\'\';document.getElementById(\'sts-fleetrack\').value=\'Yes\';filterStsTable()">Clear</button>')) {
  html = html.replace('<div style="display:flex;align-items:flex-end;">\n            <button class="rpt-action-btn" onclick="document.getElementById(\'sts-region\').value=\'\';document.getElementById(\'sts-customer\').value=\'\';document.getElementById(\'sts-model\').value=\'\';document.getElementById(\'sts-fleetrack\').value=\'Yes\';filterStsTable()">Clear</button>', newFilterClearBtnHTML);
}

// 2. Rewrite render logic
const targetRenderLogicStart = `      tbody.innerHTML = enrichedRows.map(obj => {
         const { m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, isOverdue, isApproaching } = obj;`;
         
const targetRenderLogicEnd = `        </tr>\`;
      }).join('');`;

const oldLogicFull = html.substring(html.indexOf(targetRenderLogicStart), html.indexOf(targetRenderLogicEnd) + targetRenderLogicEnd.length);

const newLogicFull = `      const renderRow = (obj, hideCustomer) => {
         const { m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, isOverdue, isApproaching } = obj;
         let hmrDisplay = currentHmr.toLocaleString();
         let warningIcon = '';
         if (likelyOverdue) {
             warningIcon = \`<span title="Likely Overdue: HMR is stale and estimated usage (\${Math.round(obj.estimatedHmr)}h) puts it over the next service target." style="cursor:help;color:#f59e0b;font-size:14px;margin-left:4px;">⚠️</span>\`;
         }
         let hrsColour = '#0f172a';
         if (isOverdue || likelyOverdue) hrsColour = '#ef4444';
         else if (isApproaching) hrsColour = '#f59e0b';
         let dateColour = isStale ? '#ef4444' : '#475569';
         let dateWarning = isStale ? \`<br><span style="font-size:10px;color:#ef4444;font-weight:600;">Stale (>&nbsp;\${isApproaching ? 1 : 5}d)</span>\` : '';

         return \`<tr>
          <td style="font-weight:600;color:\${hideCustomer?'#cbd5e1':'#0f172a'};">\${hideCustomer ? '↳' : (m.customer || '—')}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;">\${m.model || '—'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">\${m.name || '—'} | SN: \${m.sn || '—'}</div>
          </td>
          <td style="font-weight:500;">\${isType}</td>
          <td style="font-weight:500;color:#0f172a;">\${lastServiceStr}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a;">\${hmrDisplay}\${warningIcon}</td>
          <td style="text-align:right;font-weight:700;color:#475569;">\${nextSrvHmr.toLocaleString()}</td>
          <td style="text-align:right;font-weight:800;color:\${hrsColour};">\${hrsRemaining.toLocaleString()}</td>
          <td style="color:\${dateColour};font-weight:\${isStale?'700':'400'};">\${lastHmrStr}\${dateWarning}</td>
        </tr>\`;
      };

      const isGrouped = document.getElementById('sts-group-customer')?.checked;
      
      if (isGrouped) {
         const groups = {};
         enrichedRows.forEach(obj => {
           const c = obj.m.customer || 'Unknown Customer';
           if (!groups[c]) groups[c] = [];
           groups[c].push(obj);
         });
         const sortedGroups = Object.keys(groups).sort((a,b) => a.localeCompare(b));
         
         let finalHtml = '';
         sortedGroups.forEach(cust => {
            finalHtml += \`<tr><td colspan="8" style="background:#f8fafc; font-weight:800; color:#1e293b; padding:12px 16px; border-bottom:2px solid #e2e8f0; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;"><span style="margin-right:8px; opacity:0.6;">🏢</span> \${cust} <span style="margin-left:8px; font-size:11px; color:#64748b; background:#e2e8f0; padding:2px 8px; border-radius:99px;">\${groups[cust].length}</span></td></tr>\`;
            finalHtml += groups[cust].map(obj => renderRow(obj, true)).join('');
         });
         tbody.innerHTML = finalHtml;
      } else {
         tbody.innerHTML = enrichedRows.map(obj => renderRow(obj, false)).join('');
      }`;

if (oldLogicFull.includes('tbody.innerHTML = enrichedRows.map')) {
  html = html.replace(oldLogicFull, newLogicFull);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Successfully patched STR to support Group By Customer.");
} else {
  console.log("Failed to find target rendering logic.");
}
