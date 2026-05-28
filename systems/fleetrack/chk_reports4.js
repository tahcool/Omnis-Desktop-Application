const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find view-frappe-report div
const idx = c.indexOf('id="view-frappe-report"');
console.log('view-frappe-report at line ~'+c.substring(0,idx).split('\n').length);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+600)));
// Find runNativeReport
const idx2 = c.indexOf('function runNativeReport');
console.log('\nrunNativeReport at line ~'+c.substring(0,idx2).split('\n').length);
if(idx2>=0) console.log(JSON.stringify(c.substring(idx2, idx2+900)));
