const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const blocks = [];
let i = 0;
const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while((m = re.exec(c)) !== null) blocks.push({start: c.substring(0,m.index).split('\n').length, code: m[1]});
// Check block 2 (index 1)
const b = blocks[1];
console.log('Block 2 starts at line', b.start, 'length:', b.code.length);
try { new Function(b.code); console.log('OK'); }
catch(e) { 
  console.log('ERROR:', e.message);
  // Find the approximate position
  const lines = b.code.split('\n');
  lines.slice(0, 30).forEach((l,i) => console.log((i+1)+': '+l.substring(0,100)));
}
