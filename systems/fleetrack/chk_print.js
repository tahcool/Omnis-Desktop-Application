const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find print-related code
const lines = c.split('\n');
lines.forEach((l,i) => {
  if (/print|@media print|printToPDF|window\.print/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,120));
  }
});
