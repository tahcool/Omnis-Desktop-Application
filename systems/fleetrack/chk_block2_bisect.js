const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Block 2: lines 5482 - 11552 (get the actual end)
let inScript = false, blk=0, scriptStart=-1;
let block2 = null;
for(let j=0;j<lines.length;j++) {
  if(!inScript && /<script[^>]*>/.test(lines[j]) && !/src=/.test(lines[j])) {
    inScript=true; scriptStart=j; blk++;
  } else if(inScript && /<\/script>/.test(lines[j])) {
    if(blk===2) { block2 = {start:scriptStart+1, end:j+1, code:lines.slice(scriptStart+1,j).join('\n')}; }
    inScript=false;
  }
}
console.log('Block 2: lines',block2.start,'to',block2.end,'(', (block2.end-block2.start),'lines)');
// Find ACTUAL error line with binary search
const bl = block2.code.split('\n');
let lo=1, hi=bl.length;
while(hi-lo>1){
  const mid=Math.floor((lo+hi)/2);
  try{new vm.Script(bl.slice(0,mid).join('\n'));lo=mid;}catch(_){hi=mid;}
}
const globalLine = block2.start + hi - 1;
console.log('Error at block-local line:', hi, '/ global line:', globalLine);
lines.slice(Math.max(0,globalLine-4),globalLine+5).forEach((l,i)=>
  console.log('  '+(globalLine-4+i+1)+': '+l.substring(0,130)));
