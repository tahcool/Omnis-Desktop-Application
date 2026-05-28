const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Check .hidden CSS rule
const hiddenMatch = c.match(/\.hidden\s*\{[^}]+\}/g);
console.log('Hidden CSS rules:', hiddenMatch);
// Check jc-create overlay style  
const idx1 = c.indexOf('jc-create-modal-overlay');
console.log('JC Create overlay:', JSON.stringify(c.substring(idx1, idx1+120)));
