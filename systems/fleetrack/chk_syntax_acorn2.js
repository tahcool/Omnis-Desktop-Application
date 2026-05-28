const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
const code = lines.slice(5482, 11551).join('\n');
// Binary search for the error line
let lo = 1, hi = code.split('\n').length;
while(hi - lo > 1) {
  const mid = Math.floor((lo+hi)/2);
  const chunk = code.split('\n').slice(0, mid).join('\n');
  try { new vm.Script(chunk); lo = mid; } 
  catch(e) { hi = mid; }
}
console.log('Error near block line:', hi, '(global line:', 5482+hi+')');
code.split('\n').slice(Math.max(0,hi-3), hi+3).forEach((l,i)=>console.log((5482+hi-3+i+1)+': '+l.substring(0,120)));
