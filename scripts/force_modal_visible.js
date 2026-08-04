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
      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
      overlay.style.visibility = "visible";
      overlay.style.opacity = "1";
      overlay.style.zIndex = "2147483647";
      overlay.style.backdropFilter = "none"; // Fix for potential WebGL crash`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  
  // also clean up the aggressive alerts so the user doesn't get annoyed
  html = html.replace(`alert("EDIT BUTTON CLICKED! Name: " + row.name);`, ``);
  html = html.replace(`alert("MODAL SHOULD BE OPEN NOW!");`, ``);
  
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Forced modal CSS visibility and removed alerts");
} else {
  console.log("Target not found");
}
