const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const target = `<button onclick="showView('view-field-service-planning')" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Go to full planner</button>`;

const replacement = `<button onclick="openFspModal()" style="background:#3b82f6; border:1px solid #2563eb; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#ffffff; cursor:pointer; margin-right: 8px;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Create Service Plan</button>
            ` + target;

if (html.includes(target) && !html.includes('Create Service Plan')) {
  html = html.replace(target, replacement);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log('Button added successfully.');
} else {
  console.log('Target not found or already added.');
}
