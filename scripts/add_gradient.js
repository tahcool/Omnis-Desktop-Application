const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// The user wants a subtle gradient effect with white. 
// We will replace background: var(--bg-main); in the body and app-shell
// with background: linear-gradient(135deg, var(--bg-main) 0%, #ffffff 100%);
// We also need to add background-attachment: fixed; so the gradient doesn't repeat on scroll.

content = content.replace(
  "body {\n      min-height: 100vh;\n      margin: 0;\n      padding: 0;\n      background: var(--bg-main);",
  "body {\n      min-height: 100vh;\n      margin: 0;\n      padding: 0;\n      background: linear-gradient(135deg, var(--bg-main) 0%, #ffffff 100%);\n      background-attachment: fixed;"
);

content = content.replace(
  "    .app-shell {\n      width: 100%;\n      min-height: 100vh;\n      display: block;\n      background: var(--bg-main);\n    }",
  "    .app-shell {\n      width: 100%;\n      min-height: 100vh;\n      display: block;\n      background: transparent;\n    }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Added gradient');
