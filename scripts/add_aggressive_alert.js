const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `btnEdit.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            openDbrEditModal(row.name);
          } catch(err) {
            alert("Edit Button Crash: " + err.message);
          }
        };`;

const replaceStr = `btnEdit.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          alert("EDIT BUTTON CLICKED! Name: " + row.name);
          try {
            openDbrEditModal(row.name);
            alert("MODAL SHOULD BE OPEN NOW!");
          } catch(err) {
            alert("Edit Button Crash: " + err.message);
          }
        };`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Added aggressive alerts to edit button");
} else {
  console.log("Could not find onclick target. It might have been modified.");
}
