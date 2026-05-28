const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the native-report-print-bar div and surrounding context
const idx = c.indexOf('id="native-report-print-bar"');
console.log('print-bar at line ~'+c.substring(0,idx).split('\n').length);
console.log(JSON.stringify(c.substring(idx-20, idx+600)));
// Also find filterHtml += Run Report button
const idx2 = c.indexOf('Run Report</button>');
console.log('\nRun Report btn at line ~'+c.substring(0,idx2).split('\n').length);
console.log(JSON.stringify(c.substring(idx2-50, idx2+80)));
