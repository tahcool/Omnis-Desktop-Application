const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m, blk = 0;
while((m = re.exec(c)) !== null) {
  blk++;
  const startLine = c.substring(0,m.index).split('\n').length;
  try { new Function(m[1]); }
  catch(e) { 
    console.log('BLOCK '+blk+' (line ~'+startLine+') ERROR:', e.message);
    const lines = m[1].split('\n');
    for(let i=0;i<Math.min(lines.length,20);i++) {
      if(lines[i].trim()) console.log('  '+(i+1)+': '+lines[i].substring(0,100));
    }
  }
}
console.log('Total blocks:', blk);
