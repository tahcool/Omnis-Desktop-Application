const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ── 1. Add 🖨️ PDF button alongside ✎ View/Edit in the JC table ─────────────
// The pattern to find: after "openJobCardDetail('${escapedName}')"
// Set window.CURRENT_JC_ROW = j when clicking either View/Edit or Print
const jcViewOld = `<button onclick="event.stopPropagation(); openJobCardDetail('\${escapedName}')"\r\nstyle="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;">\r\n✎ View/Edit</button>`;

// Not found as-is due to template literals - let's do it a different way
// Find the td containing the View/Edit button and add after it
const oldViewEdit = `onclick="event.stopPropagation(); openJobCardDetail('\${escapedName}')"\nstyle="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;">\n✎ View/Edit</button>`;

console.log('looking for view/edit pattern...');
const idx = c.indexOf("openJobCardDetail('${escapedName}')");
if(idx>=0) {
  console.log('Found JC View at:', idx);
  // Find the surrounding context
  const before = c.substring(Math.max(0,idx-120), idx+200);
  console.log(JSON.stringify(before));
}
