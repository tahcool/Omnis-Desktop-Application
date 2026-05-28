const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the DBR filter bar
const idx = c.indexOf('id="dbr-filter-bar"');
if (idx < 0) { console.log('not found, trying dbr-region'); }
const idx2 = c.indexOf('dbr-region');
console.log('dbr-filter-bar:', idx);
console.log('dbr-region:', idx2);
if (idx2>=0) console.log(JSON.stringify(c.substring(Math.max(0,idx2-500), idx2+200)));
