const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
// Find the Service Due view container and nav items
lines.forEach((l,i) => {
  if (/service.due|view-service|service_due|nav.*service|data-view.*service/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,130));
  }
});
