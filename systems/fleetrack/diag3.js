const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the view-about div end, then find closing tags after it
const idx = c.indexOf('<!-- About View -->');
const chunk = c.substring(idx, idx+2000);
const lines = chunk.split('\n');
lines.slice(0,50).forEach((l,i)=>console.log((i+1)+':',l.substring(0,100)));
