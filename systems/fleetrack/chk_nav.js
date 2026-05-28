const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
lines.forEach((l,i) => {
  if (/view-service-due|view-customers|VIEW_MAP|viewsMap|data-view.*service|data-view.*customer/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,120));
  }
});
