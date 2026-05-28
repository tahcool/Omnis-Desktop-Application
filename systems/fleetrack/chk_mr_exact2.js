const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find what comes AFTER 'Register a new machine' in the file
const idx = c.indexOf('Register a new machine');
if(idx>=0) {
  const chunk = c.substring(idx-20, idx+300);
  console.log(JSON.stringify(chunk));
}
// Find @media print block
const idx2 = c.indexOf('@media print');
console.log('@media print at:', idx2);
if(idx2>=0) console.log(JSON.stringify(c.substring(idx2, idx2+500)));
