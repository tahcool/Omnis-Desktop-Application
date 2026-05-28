const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the Machine Register header where Export/Print button might go
const idx = c.indexOf('id="view-machines"');
console.log('view-machines at:', idx);
if(idx>=0) {
  const chunk = c.substring(idx, idx+800);
  console.log(JSON.stringify(chunk.substring(0,600)));
}
