const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `function openDbrEditModal(name) {
      const row = DBR_ROWS_CACHE[name];`;

const replaceStr = `function openDbrEditModal(name) {
    try {
      const row = DBR_ROWS_CACHE[name];`;

const endStr = `document.getElementById("db-edit-approve").style.display = "none";
      }
    }`;

const replaceEndStr = `document.getElementById("db-edit-approve").style.display = "none";
      }
    } catch(err) {
      showToast("Edit Modal Error: " + err.message, "err", 10000);
      console.error(err);
    }
  }`;

if (html.includes(targetStr) && html.includes(endStr)) {
  html = html.replace(targetStr, replaceStr);
  html = html.replace(endStr, replaceEndStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("try-catch added to openDbrEditModal");
} else {
  console.log("Could not find targets");
}
