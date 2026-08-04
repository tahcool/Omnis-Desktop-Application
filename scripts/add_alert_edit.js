const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `btnEdit.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          showToast("DEBUG: Direct Click on " + row.name, "info");
          openDbrEditModal(row.name);
        };`;

const replaceStr = `btnEdit.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            openDbrEditModal(row.name);
          } catch(err) {
            alert("Edit Button Crash: " + err.message);
          }
        };`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Added alert to edit button");
} else {
  console.log("Could not find onclick target");
}
