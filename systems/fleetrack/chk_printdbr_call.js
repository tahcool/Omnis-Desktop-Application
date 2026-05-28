const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find filter bar injection with both buttons
const idx = c.indexOf('native-report-print-bar');
let i = idx;
let count = 0;
while(i !== -1 && count < 10) {
  const line = c.substring(0,i).split('\n').length;
  console.log('print-bar at line', line, ':', JSON.stringify(c.substring(i, i+80)));
  i = c.indexOf('native-report-print-bar', i+1);
  count++;
}
