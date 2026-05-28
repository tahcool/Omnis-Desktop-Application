const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the machine register header section - look for "Machine Registry" h1
const idx = c.indexOf('Machine Registry</h1>');
console.log('Machine Registry h1 at:', idx);
if(idx>=0) {
  console.log(JSON.stringify(c.substring(idx-20, idx+600)));
}
