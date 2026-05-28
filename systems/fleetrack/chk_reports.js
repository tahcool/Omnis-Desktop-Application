const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find all report views and their print buttons
lines.forEach((l,i) => {
  if (/view-report|showReport|report-btn|loadReport|renderReport|printReport|printMWR|printHmr|printDBR/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,110));
  }
});
