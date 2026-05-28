const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('function printDBR');
console.log('printDBR at:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+300)));
