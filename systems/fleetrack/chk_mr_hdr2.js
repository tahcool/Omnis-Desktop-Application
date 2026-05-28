const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('Machine Registry</h1>');
const chunk = c.substring(idx, idx+900);
// Find the buttons area
const btnIdx = chunk.indexOf('display:flex; gap:12px;');
console.log(JSON.stringify(chunk.substring(btnIdx, btnIdx+500)));
