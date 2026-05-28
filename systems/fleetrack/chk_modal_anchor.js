const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find good anchor for modal injection - just before closing </body>
const bodyClose = c.lastIndexOf('</body>');
console.log('</body> at line ~'+c.substring(0,bodyClose).split('\n').length);
// Find where printCurrentReportPrinter is defined
const idx = c.indexOf('window.printCurrentReportPrinter');
console.log('printCurrentReportPrinter at line ~'+c.substring(0,idx).split('\n').length);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+600)));
