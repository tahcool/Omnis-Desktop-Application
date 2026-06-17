const fs = require('fs');
const file = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let content = fs.readFileSync(file, 'utf8');

const target = `      } else if (viewId === "view-settings") {
        if (typeof salestrack !== 'undefined' && salestrack.loadSettings) salestrack.loadSettings();
        if (mainTitle) mainTitle.textContent = "System Settings";
        if (mainSubtitle) mainSubtitle.textContent = "Configure your application preferences and integrations.";
      } else if (viewId === "view-orders-list") {`;

const replace = `      } else if (viewId === "view-settings") {
        if (typeof salestrack !== 'undefined' && salestrack.loadSettings) salestrack.loadSettings();
        if (mainTitle) mainTitle.textContent = "System Settings";
        if (mainSubtitle) mainSubtitle.textContent = "Configure your application preferences and integrations.";

        // ─── ELECTRON REPAINT FIX ─────────────────────────────────────────
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
        }
      } else if (viewId === "view-orders-list") {`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully applied repaint fix to view-settings.");
} else {
    console.log("Failed to find target in index.html");
}
