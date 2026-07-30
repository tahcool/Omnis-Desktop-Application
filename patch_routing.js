const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `      if (viewId === "view-fsi") {
        loadFieldServicePlan();
      }`;
const replaceStr = `      if (viewId === "view-fsi") {
        loadFieldServicePlan();
      }

      if (viewId === "view-technicians") {
        loadTechniciansView();
      }`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Successfully patched second showView routing!");
} else {
  console.log("Could not find target string in second showView!");
}
