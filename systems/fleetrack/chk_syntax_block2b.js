const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Block 2 is lines 5482-11552
const code = lines.slice(5482, 11551).join('\n');
console.log('Block 2 length:', code.length);
// Bisect to find error
let lo = 0, hi = code.length;
while(hi - lo > 200) {
  const mid = Math.floor((lo+hi)/2);
  try { new Function(code.substring(0, mid)); lo = mid; }
  catch(e) { hi = mid; }
}
const errOffset = lo;
console.log('Error near char offset:', errOffset);
// Find which line in the block
const beforeErr = code.substring(0, errOffset);
const errLine = beforeErr.split('\n').length + 5482;
console.log('Approx global line:', errLine);
console.log('Context:');
lines.slice(errLine-3, errLine+4).forEach((l,i) => console.log((errLine-3+i+1)+': '+l.substring(0,120)));
