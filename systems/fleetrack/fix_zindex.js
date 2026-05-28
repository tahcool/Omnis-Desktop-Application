const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Fix 1: jc-modal-overlay z-index 500 → 2147483647
c = c.replace(
  'position: fixed; inset: 0; background: rgba(15,23,42,0.65);\r\n    display: flex; align-items: center; justify-content: center; z-index: 500;\r\n  ">\r\n    <div style="\r\n      width: 1000px;',
  'position: fixed; inset: 0; background: rgba(15,23,42,0.65);\r\n    display: flex; align-items: center; justify-content: center; z-index: 2147483647;\r\n  ">\r\n    <div style="\r\n      width: 1000px;'
);

// Fix 2: jc-create-modal-overlay z-index 500 → 2147483647
c = c.replace(
  'position: fixed; inset: 0; background: rgba(15,23,42,0.65);\r\n    display: flex; align-items: center; justify-content: center; z-index: 500;\r\n  ">\r\n    <div style="\r\n      width: 500px;',
  'position: fixed; inset: 0; background: rgba(15,23,42,0.65);\r\n    display: flex; align-items: center; justify-content: center; z-index: 2147483647;\r\n  ">\r\n    <div style="\r\n      width: 500px;'
);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('z-index patched');

// Verify
const idx1 = c.indexOf('jc-modal-overlay');
const s1 = c.substring(idx1, idx1+300);
console.log('jc-modal-overlay z-index:', s1.match(/z-index:\s*(\d+)/)?.[1]);

const idx2 = c.indexOf('jc-create-modal-overlay');
const s2 = c.substring(idx2, idx2+300);
console.log('jc-create-modal-overlay z-index:', s2.match(/z-index:\s*(\d+)/)?.[1]);
