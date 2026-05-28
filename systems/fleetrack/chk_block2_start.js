const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Block 2 starts at 5482. Look at what comes BEFORE line 5482 
// (last few lines of previous script block) to see if the </script> closed correctly
console.log('Lines 5478-5490:');
lines.slice(5477,5490).forEach((l,i)=>console.log((5478+i)+': '+JSON.stringify(l.substring(0,120))));
// Also check if block 2 code actually starts with a problem
// Try parsing just lines 1-10 of block 2
const block2code = lines.slice(5482,5492).join('\n');
try { new vm.Script(block2code); console.log('Lines 5483-5492: OK'); }
catch(e) { 
  console.log('Lines 5483-5492 ERROR:', e.message);
  // Check for hidden chars
  const b = lines[5486]; // empty line
  console.log('Line 5487 bytes:', Buffer.from(b).toString('hex'));
}
