const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const startTarget = '      const renderRow = (obj, hideCustomer) => {';
const endTarget = '         tbody.innerHTML = enrichedRows.map(obj => renderRow(obj, false)).join(\'\');\n      }';

const startIdx = html.indexOf(startTarget);
const endIdx = html.indexOf(endTarget, startIdx) + endTarget.length;

if (startIdx !== -1 && html.indexOf(endTarget, startIdx) !== -1) {
  const newLogicFull = `      const renderRow = (obj, isGrouped, isFirstInGroup, groupCount, custName) => {
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

         let custTd = '';
         if (isGrouped) {
             if (isFirstInGroup) {
                 custTd = \`<td rowspan="\${groupCount}" style="background:#ffffff; border-right:1px solid #e2e8f0; vertical-align:top; padding:16px;">
                   <div style="font-weight:800;color:#0f172a;font-size:13px;">\${custName}</div>
                   <div style="font-size:11px;color:#64748b;margin-top:4px;">\${groupCount} Machines</div>
                 </td>\`;
             }
         } else {
             custTd = \`<td style="font-weight:600;color:#0f172a;">\${m.customer || '—'}</td>\`;
         }

         return \`<tr>
          \${custTd}
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
            const count = groups[cust].length;
            groups[cust].forEach((obj, idx) => {
               finalHtml += renderRow(obj, true, idx === 0, count, cust);
            });
         });
         tbody.innerHTML = finalHtml;
      } else {
         tbody.innerHTML = enrichedRows.map(obj => renderRow(obj, false, false, 0, '')).join('');
      }`;

  html = html.substring(0, startIdx) + newLogicFull + html.substring(endIdx);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Successfully patched STR grouping style.");
} else {
  console.log("Failed to find target indices.", startIdx);
}
