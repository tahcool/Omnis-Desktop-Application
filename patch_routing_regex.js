const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const regex = /if\s*\(viewId\s*===\s*"view-fsi"\)\s*\{\s*loadFieldServicePlan\(\);\s*\}/;

if (regex.test(html)) {
  html = html.replace(regex, `if (viewId === "view-fsi") {\n        loadFieldServicePlan();\n      }\n\n      if (viewId === "view-technicians") {\n        loadTechniciansView();\n      }`);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Successfully patched second showView routing using regex!");
} else {
  console.log("Could not find regex match!");
}
