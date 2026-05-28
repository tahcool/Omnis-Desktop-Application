const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('id="view-machines"');
const chunk = c.substring(idx, idx+2200);
const lines = chunk.split('\n');
lines.slice(25,55).forEach((l,i) => console.log((i+26)+':', l.substring(0,110)));
