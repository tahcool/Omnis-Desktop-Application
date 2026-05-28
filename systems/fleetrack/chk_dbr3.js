const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the DBR table header
const idx = c.indexOf('CUSTOMER \u2195');
console.log('CUSTOMER col at:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(Math.max(0,idx-1500), idx+200)));

// Also find filter-group or filter-row class
const idx2 = c.indexOf('filter-group');
console.log('filter-group at:', idx2);
if(idx2>=0) console.log(JSON.stringify(c.substring(Math.max(0,idx2-300), idx2+500)));
