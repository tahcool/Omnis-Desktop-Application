const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// The old actions td innerHTML (inside the template literal)
const oldActions = `          <td style="padding:10px 8px; white-space:nowrap;">\r\n            <button onclick="event.stopPropagation(); openJobCardDetail('\${escapedName}')"\r\n              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">\r\n              ✎ View/Edit</button>\r\n            \${!isClosed ? \`<button onclick="event.stopPropagation(); updateJobCardStatus('\${escapedName}', 'Closed', this)"\r\n              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#10b981;color:white;border-radius:5px;cursor:pointer;">\r\n              ✓ Close</button>\` : ""}\r\n          </td>`;

const newActions = `          <td style="padding:10px 8px; white-space:nowrap;">\r\n            <button onclick="event.stopPropagation(); window.CURRENT_JC_ROW=j; openJobCardDetail('\${escapedName}')"\r\n              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">\r\n              ✎ View/Edit</button>\r\n            <button onclick="event.stopPropagation(); window.printJobCard(j);"\r\n              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#0f172a;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">\r\n              🖨️ PDF</button>\r\n            \${!isClosed ? \`<button onclick="event.stopPropagation(); updateJobCardStatus('\${escapedName}', 'Closed', this)"\r\n              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#10b981;color:white;border-radius:5px;cursor:pointer;">\r\n              ✓ Close</button>\` : ""}\r\n          </td>`;

console.log('Found:', c.includes(oldActions));
c = c.replace(oldActions, newActions);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
