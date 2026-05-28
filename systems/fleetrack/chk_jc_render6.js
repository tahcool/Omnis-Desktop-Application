const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('function renderJobCardTable');
const chunk = c.substring(idx, idx+2800);
// Show all lines
const lines = chunk.split('\n');
lines.forEach((l,i) => { if(l.trim()) console.log((i+1)+':', l.trim().substring(0,100)); });
