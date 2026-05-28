const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find where job cards are rendered in the table with onclick
const idx = c.indexOf('openJobCardDetail(jc.name)');
console.log('JC onclick at:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(Math.max(0,idx-200), idx+100)));
// Find jc-modal-overlay show
const idx2 = c.indexOf('jc-modal-overlay');
let i = idx2;
while(i !== -1) {
  console.log('jc-modal-overlay at:', i);
  i = c.indexOf('jc-modal-overlay', i+1);
  if (i > idx2 + 5000) break;
}
