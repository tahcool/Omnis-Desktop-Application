const fs = require('fs');
const file = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('} else if (viewId === "view-settings") {')) {
        // we found the start. Let's see if we can find the end.
        for (let j = i + 1; j < i + 10; j++) {
            if (lines[j] && lines[j].includes('} else if (viewId === "view-orders-list") {')) {
                // Perfect, let's insert before line j
                if (!content.includes('const _settingsEl = document.getElementById(\'view-settings\');')) {
                    lines.splice(j, 0, 
`        // ─── ELECTRON REPAINT FIX ─────────────────────────────────────────
        const _settingsEl = document.getElementById('view-settings');
        if (_settingsEl) {
          _settingsEl.scrollTop = 0;
          void _settingsEl.offsetHeight;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const _mvc = document.getElementById('main-view-container');
              if (_mvc) {
                _mvc.scrollTop = 0;
                _mvc.style.transform = 'translateZ(0)';
                void _mvc.offsetHeight;
                _mvc.style.transform = 'none';
              }
            });
          });
        }`);
                    modified = true;
                }
                break;
            }
        }
        break;
    }
}

if (modified) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log("Successfully applied repaint fix to view-settings.");
} else {
    console.log("Repaint fix already applied or target not found.");
}
