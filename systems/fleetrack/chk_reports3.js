const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find openFrappeReport function definition
const idx = c.indexOf('function openFrappeReport');
console.log('openFrappeReport at line ~'+c.substring(0,idx).split('\n').length);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+800)));
