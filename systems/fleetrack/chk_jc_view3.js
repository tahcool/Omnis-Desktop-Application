const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find the exact byte offset of the JC View/Edit button
const searchStr = "openJobCardDetail('" + "${escapedName}')";
const idx = c.indexOf(searchStr);
console.log('JC View button offset:', idx);
if(idx>=0) {
  // Get context around it
  const before = c.substring(Math.max(0,idx-200), idx+600);
  console.log(JSON.stringify(before));
}
