const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Add Resp header
const thOld = `                  <th onclick="sortDbrData('red')" style="cursor:pointer;padding:10px 8px;text-align:left;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);vertical-align:bottom;color:#ffffff !important;width:100px;white-space:nowrap;">
                    RED ⇅</th>
                  <th onclick="sortDbrData('status')" style="cursor:pointer;padding:10px 8px;text-align:left;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);vertical-align:bottom;color:#ffffff !important;width:160px;">
                    Status ⇅</th>`;
const thNew = `                  <th onclick="sortDbrData('red')" style="cursor:pointer;padding:10px 8px;text-align:left;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);vertical-align:bottom;color:#ffffff !important;width:100px;white-space:nowrap;">
                    RED ⇅</th>
                  <th onclick="sortDbrData('resp')" style="cursor:pointer;padding:10px 8px;text-align:center;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);vertical-align:bottom;color:#ffffff !important;width:80px;">
                    Resp. ⇅</th>
                  <th onclick="sortDbrData('status')" style="cursor:pointer;padding:10px 8px;text-align:left;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);vertical-align:bottom;color:#ffffff !important;width:160px;">
                    Status ⇅</th>`;
if(html.includes(thOld)) {
  html = html.replace(thOld, thNew);
} else {
  console.log("Could not find table headers to replace.");
}

// 2. Add Resp row data
const tdOld = `          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;font-weight:500;">\${safeText(row.red)}</td>
          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;">\${statusHtml}</td>`;
const tdNew = `          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;font-weight:500;">\${safeText(row.red)}</td>
          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;text-align:center;">\n            <span style="display:inline-block;padding:2px 8px;background:#f1f5f9;border-radius:4px;font-size:10px;font-weight:700;color:#475569;">\${safeText(row.resp || 'FSD')}</span>\n          </td>
          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;">\${statusHtml}</td>`;
if(html.includes(tdOld)) {
  html = html.replace(tdOld, tdNew);
} else {
  // Let's try simpler regex if needed
  const tdOldAlt = `<td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;font-weight:500;">\${safeText(row.red)}</td>`;
  if(html.includes(tdOldAlt)) {
    console.log("Found alt TD");
    html = html.replace(tdOldAlt, tdOldAlt + `\n          <td style="padding:12px 8px;border-right:1px solid #e5e7f0;vertical-align:top;text-align:center;"><span style="display:inline-block;padding:2px 8px;background:#f1f5f9;border-radius:4px;font-size:10px;font-weight:700;color:#475569;">\${safeText(row.resp || 'FSD')}</span></td>`);
  } else {
    console.log("Could not find TD to replace.");
  }
}

// 3. Update query logic for FSD default
const queryOld = `if (filters.responsibility) query = query.ilike('responsibility', \`%\${filters.responsibility}%\`);`;
const queryNew = `if (filters.responsibility) {
          if (filters.responsibility === 'FSD') {
            query = query.or(\`responsibility.ilike.%\${filters.responsibility}%,responsibility.is.null,responsibility.eq.""\`);
          } else {
            query = query.ilike('responsibility', \`%\${filters.responsibility}%\`);
          }
        }`;
if(html.includes(queryOld)) {
  html = html.replace(queryOld, queryNew);
} else {
  console.log("Could not find query.ilike to replace.");
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Updated responsibility column and filter logic.");
