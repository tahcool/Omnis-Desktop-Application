const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
lines.forEach((l,i) => {
  if (/view-about|view-fsp|<!-- About|<!-- FSP|<!-- FIELD|nav-item.*data-view|data-view.*fsp|data-view.*about/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,110));
  }
});
