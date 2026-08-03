const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldBtn = [
  '            <!-- Log Tech Hours -->',
  '            <button onclick="openLogHoursModal()"',
  '              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f59e0b;color:#ffffff;border:1px solid transparent;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:none;transition:all .2s ease;white-space:nowrap;"',
  '              onmouseover="this.style.background=\'#d97706\';"',
  '              onmouseout="this.style.background=\'#f59e0b\';">',
  '              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  '              Log Tech Hours',
  '            </button>'
].join('\n');

const newBtn = [
  '            <!-- Log Tech Hours -->',
  '            <button onclick="openLogHoursModal()"',
  '              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#d97706;color:#ffffff;border:1px solid transparent;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:none;transition:all .2s ease;white-space:nowrap;"',
  '              onmouseover="this.style.background=\'#b45309\';"',
  '              onmouseout="this.style.background=\'#d97706\';">',
  '              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  '              Log Tech Hours',
  '            </button>'
].join('\n');

const oldBtnCRLF = oldBtn.replace(/\n/g, '\r\n');
const newBtnCRLF = newBtn.replace(/\n/g, '\r\n');

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  fs.writeFileSync('systems/fleetrack/index.html', content);
  console.log('Successfully updated Log Tech Hours button colour');
} else if (content.includes(oldBtnCRLF)) {
  content = content.replace(oldBtnCRLF, newBtnCRLF);
  fs.writeFileSync('systems/fleetrack/index.html', content);
  console.log('Successfully updated Log Tech Hours button colour (CRLF)');
} else {
  console.log('Could not find Log Tech Hours button exact match. Trying line replacement.');
  const lines = content.split('\n');
  lines[3740] = lines[3740].replace('#f59e0b', '#d97706');
  lines[3741] = lines[3741].replace('#d97706', '#b45309');
  lines[3742] = lines[3742].replace('#f59e0b', '#d97706');
  fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
  console.log('Successfully updated Log Tech Hours button colour using line replacement');
}
