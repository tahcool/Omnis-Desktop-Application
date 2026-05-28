const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m, blk = 0;
while((m = re.exec(c)) !== null) {
  blk++;
  if(blk===4) {
    const code = m[1];
    // Scan for syntax errors by trying subranges
    for(let step = 0; step < code.length; step += 5000) {
      const chunk = code.substring(0, step+5000);
      try { new Function(chunk); } 
      catch(e) {
        // Found the range
        console.log('Error in first', step+5000, 'chars');
        // Narrow down further
        const lines = code.split('\n');
        let cumLen = 0;
        for(let i=0;i<lines.length;i++) {
          cumLen += lines[i].length + 1;
          if(cumLen > step+2000) {
            console.log('Around line '+(i+1)+' in block:');
            lines.slice(Math.max(0,i-2), i+5).forEach((l,j)=>console.log((i-2+j+1)+': '+l.substring(0,110)));
            break;
          }
        }
        break;
      }
    }
  }
}
