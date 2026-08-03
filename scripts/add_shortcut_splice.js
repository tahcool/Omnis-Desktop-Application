const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const lines = content.split('\n');
const newBtn = [
  '            <!-- Log Tech Hours -->',
  '            <button onclick="openLogHoursModal()"',
  '              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f59e0b;color:#ffffff;border:1px solid transparent;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:none;transition:all .2s ease;white-space:nowrap;"',
  '              onmouseover="this.style.background=\'#d97706\';"',
  '              onmouseout="this.style.background=\'#f59e0b\';">',
  '              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  '              Log Tech Hours',
  '            </button>'
];
lines.splice(3738, 0, ...newBtn);
fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
console.log('Successfully added Log Tech Hours button using splice');
