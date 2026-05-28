const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// The regex-based syntax_check.js has a known false-positive with template literals containing XML-like content
// Let's instead use acorn or just look for the ACTUAL block 4 script that starts at line 5482
const lines = c.split('\n');
// Find script tags by line
let scriptStarts = [];
lines.forEach((l,i) => {
  if(/<script[^>]*>/i.test(l) && !/src=/i.test(l)) scriptStarts.push(i+1);
});
console.log('Script tag start lines:', scriptStarts);
// Block 4 would be scriptStarts[3] 
const b4line = scriptStarts[3];
console.log('Block 4 starts at line:', b4line);
console.log('Lines around it:');
lines.slice(b4line-2, b4line+5).forEach((l,i) => console.log((b4line-2+i+1)+': '+l.substring(0,100)));
