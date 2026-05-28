const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find view-machines and look at its header section
const idx = c.indexOf('id="view-machines"');
const chunk = c.substring(idx, idx+1800);
const lines = chunk.split('\n');
lines.forEach((l,i) => console.log((i+1)+':', l.substring(0,100)));
