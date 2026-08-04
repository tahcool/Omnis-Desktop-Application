const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `      const overlay = document.getElementById("db-edit-modal-overlay");
      if (!overlay) {
        showToast("DEBUG: Modal Overlay NOT FOUND!", "err");
        return;
      }
      overlay.classList.remove("hidden");`;

const replaceStr = `      const overlay = document.getElementById("db-edit-modal-overlay");
      if (!overlay) {
        showToast("DEBUG: Modal Overlay NOT FOUND!", "err");
        return;
      }
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
      overlay.classList.remove("hidden");`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Added body append fix");
} else {
  console.log("Target not found");
}
