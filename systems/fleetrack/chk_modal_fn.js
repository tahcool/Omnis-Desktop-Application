const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('window.openReportPrintModal = function');
console.log('at offset:', idx, 'line ~'+c.substring(0,idx).split('\n').length);
if(idx>=0) console.log(JSON.stringify(c.substring(idx-10, idx+50)));
