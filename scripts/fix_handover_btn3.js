const fs = require('fs');
let htmlPath = 'systems/salestrack/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const target = `          </div>
          <div style="position:relative; width: 250px;">`;

const replacement = `          </div>
          <button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
            <i class="fas fa-plus"></i> New Handover
          </button>
          <div style="position:relative; width: 250px;">`;

let matchCount = 0;
let finalContent = content.replace(target, () => {
    matchCount++;
    return replacement;
});

fs.writeFileSync(htmlPath, finalContent, 'utf8');
console.log(`Replaced \${matchCount} instances`);
