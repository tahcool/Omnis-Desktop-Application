const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const tdOld = `    <td style="\${commonTdStyle}white-space:nowrap;">\${red}</td>
    <td style="\${commonTdStyle}min-width:140px;">`;
    
const tdNew = `    <td style="\${commonTdStyle}white-space:nowrap;">\${red}</td>
    <td style="\${commonTdStyle}text-align:center;">
      <span style="display:inline-block;padding:2px 8px;background:#f1f5f9;border-radius:4px;font-size:10px;font-weight:700;color:#475569;">\${safeText(row.resp || 'FSD')}</span>
    </td>
    <td style="\${commonTdStyle}min-width:140px;">`;

if(html.includes(tdOld)) {
  html = html.replace(tdOld, tdNew);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Updated responsibility column cell.");
} else {
  console.log("Could not find TD to replace.");
}
