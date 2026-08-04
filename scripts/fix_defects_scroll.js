const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const custCellOld1 = `custCell = \`<td class="df-cell" rowspan="\${customerRowSpans[idx]}" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; border-right:1px solid #e2e8f0; vertical-align:middle; text-align:center; background:#f8fafc;">\${cName}</td>\`;`;
const custCellNew1 = `custCell = \`<td class="df-cell" rowspan="\${customerRowSpans[idx]}" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; border-right:1px solid #e2e8f0; vertical-align:middle; text-align:center; background:#f8fafc; max-width:140px; white-space:normal; word-wrap:break-word;">\${cName}</td>\`;`;

const custCellOld2 = `custCell = \`<td class="df-cell" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; vertical-align:middle; text-align:center;">\${cName}</td>\`;`;
const custCellNew2 = `custCell = \`<td class="df-cell" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; vertical-align:middle; text-align:center; max-width:140px; white-space:normal; word-wrap:break-word;">\${cName}</td>\`;`;

const defectHtmlOld = `            <div style="font-size:11px;color:#64748b;margin-top:4px;">\${desc}</div>`;
const defectHtmlNew = `            <div style="font-size:11px;color:#64748b;margin-top:4px; max-width:250px; white-space:normal; word-wrap:break-word; line-height:1.4;">\${desc}</div>`;

const statusHtmlOld = `const statusHtml = \`<div style="font-weight:800;color:\${statusColor};font-size:11px;text-transform:uppercase;">\${displayStatus}</div>\${extraStatusHtml}\`;`;
const statusHtmlNew = `const statusHtml = \`<div style="font-weight:800;color:\${statusColor};font-size:11px;text-transform:uppercase; max-width:180px; white-space:normal; word-wrap:break-word; line-height:1.4;">\${displayStatus}</div>\${extraStatusHtml}\`;`;

html = html.replace(custCellOld1, custCellNew1);
html = html.replace(custCellOld2, custCellNew2);
html = html.replace(defectHtmlOld, defectHtmlNew);
html = html.replace(statusHtmlOld, statusHtmlNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed scrolling in defects table');
