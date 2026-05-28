const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('function printDBR');
const chunk = c.substring(idx, idx+300);
// Show each char code for the newlines
console.log(JSON.stringify(chunk));
