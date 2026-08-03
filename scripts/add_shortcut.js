const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const logDefectBlock = `            <!-- Log Defect — secondary -->
            <button onclick="openDefectModal(null)"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#dc2626;color:#ffffff;border:1px solid transparent;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:none;transition:all .2s ease;white-space:nowrap;"
              onmouseover="this.style.background='#b91c1c';"
              onmouseout="this.style.background='#dc2626';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Log Defect
            </button>`;

const replacement = logDefectBlock + `

            <!-- Log Tech Hours -->
            <button onclick="openLogHoursModal()"
              style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f59e0b;color:#ffffff;border:1px solid transparent;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:none;transition:all .2s ease;white-space:nowrap;"
              onmouseover="this.style.background='#d97706';"
              onmouseout="this.style.background='#f59e0b';">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Log Tech Hours
            </button>`;

if (content.includes(logDefectBlock)) {
  content = content.replace(logDefectBlock, replacement);
  fs.writeFileSync('systems/fleetrack/index.html', content);
  console.log('Successfully added Log Tech Hours button to Shortcuts');
} else {
  console.log('Could not find Log Defect block exactly. Trying line splice approach.');
}
