const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('function renderJobCardTable');
console.log('renderJobCardTable at:', idx, 'line ~'+c.substring(0,idx).split('\n').length);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+1200)));
