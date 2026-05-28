const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find ALL occurrences of rpt-print-modal
let i = -1, count = 0;
while(true) {
  i = c.indexOf('rpt-print-modal', i+1);
  if(i===-1) break;
  count++;
  const line = c.substring(0,i).split('\n').length;
  const ctx = c.substring(i-30,i+50);
  console.log(count+'. Line ~'+line+':', JSON.stringify(ctx.substring(0,80)));
}
// Find block 2 end
const lines = c.split('\n');
let inScript = false, blk=0, scriptStart=-1;
for(let j=0;j<lines.length;j++) {
  if(!inScript && /<script[^>]*>/.test(lines[j]) && !/src=/.test(lines[j])) {
    inScript=true; scriptStart=j+1; blk++;
    if(blk===2) console.log('\nBlock 2 starts at line', j+1);
  } else if(inScript && /<\/script>/.test(lines[j])) {
    if(blk===2) console.log('Block 2 ends at line', j+1);
    inScript=false;
  }
}
