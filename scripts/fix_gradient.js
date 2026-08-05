const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the view-page background obscuring the body gradient
content = content.replace(
  "    .view-page:not(.hidden),\n    .view-item:not(.hidden) {\n      position: fixed;\n      top: 80px;\n      left: 0;\n      right: 0;\n      bottom: 0;\n      overflow-y: auto;\n      overflow-x: hidden;\n      padding: 20px 24px 24px 24px;\n      background: var(--bg-main);",
  "    .view-page:not(.hidden),\n    .view-item:not(.hidden) {\n      position: fixed;\n      top: 80px;\n      left: 0;\n      right: 0;\n      bottom: 0;\n      overflow-y: auto;\n      overflow-x: hidden;\n      padding: 20px 24px 24px 24px;\n      background: transparent;"
);

// 2. Fix the body gradient regex failure
// The current body CSS has:
// background-image: radial-gradient(rgba(0, 0, 0, 0.25) 2px, transparent 2px), linear-gradient(135deg, #475569 0%, #94a3b8 40%, #ffffff 100%);
// background-size: 24px 24px, 100% 100%;
const bodyCssSearch = /background-image: radial-gradient.*?\n\s*background-size: 24px 24px, 100% 100%;/m;
content = content.replace(bodyCssSearch, "background: radial-gradient(circle at center, #ffffff 0%, #cbd5e1 50%, #475569 100%);");

// Wait, just in case the body hasn't been updated, let's also remove any `background: var(--bg-main)` in body
const bodyRegex = /body\s*\{\s*min-height:\s*100vh;\s*margin:\s*0;\s*padding:\s*0;([\s\S]*?)overflow:\s*hidden;/m;
content = content.replace(bodyRegex, (match, inner) => {
  return `body {
      min-height: 100vh;
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at center, #ffffff 0%, #cbd5e1 50%, #475569 100%);
      background-attachment: fixed;
      color: var(--text-main);
      overflow: hidden;`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed background stacking and applied radial gradient');
