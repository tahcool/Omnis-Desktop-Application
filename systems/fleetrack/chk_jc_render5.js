const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('function renderJobCardTable');
const chunk = c.substring(idx, idx+2200);
// Find where view/edit button is set
const editIdx = chunk.indexOf('?? Edit');
console.log('Edit button at offset:', editIdx);
if(editIdx>=0) console.log(JSON.stringify(chunk.substring(editIdx-200, editIdx+150)));
