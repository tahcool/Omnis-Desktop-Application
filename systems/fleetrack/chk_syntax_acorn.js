const fs = require('fs');
// Try using node's own parsing via vm module
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
const code = lines.slice(5482, 11551).join('\n');
try {
  new vm.Script(code);
  console.log('Block 2: VALID JavaScript');
} catch(e) {
  console.log('Block 2 vm.Script error:', e.message);
  // Get line number from error
  if(e.lineNumber) {
    console.log('Error line (in block):', e.lineNumber);
    const errLine = 5482 + e.lineNumber - 1;
    console.log('Global line:', errLine);
    lines.slice(errLine-2, errLine+3).forEach((l,i) => console.log((errLine-2+i+1)+': '+l.substring(0,120)));
  }
}
