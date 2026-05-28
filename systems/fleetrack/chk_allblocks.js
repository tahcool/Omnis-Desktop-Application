const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
let inScript = false, blk=0, scriptStart=-1;
const scripts = [];
for(let j=0;j<lines.length;j++) {
  if(!inScript && /<script[^>]*>/.test(lines[j]) && !/src=/.test(lines[j])) {
    inScript=true; scriptStart=j; blk++;
  } else if(inScript && /<\/script>/.test(lines[j])) {
    scripts.push({blk, start:scriptStart+1, end:j+1, code:lines.slice(scriptStart+1,j).join('\n')});
    inScript=false;
  }
}
console.log('Script blocks:', scripts.length);
scripts.forEach(s => {
  try { new vm.Script(s.code); }
  catch(e) {
    // bisect
    const bl = s.code.split('\n');
    let lo=1, hi=bl.length;
    while(hi-lo>1){
      const mid=Math.floor((lo+hi)/2);
      try{new vm.Script(bl.slice(0,mid).join('\n'));lo=mid;}catch(_){hi=mid;}
    }
    const globalLine = s.start + hi - 1;
    console.log('BLOCK '+s.blk+' ERROR at global line ~'+globalLine+': '+e.message);
    lines.slice(Math.max(0,globalLine-3),globalLine+3).forEach((l,i)=>
      console.log('  '+(globalLine-3+i+1)+': '+l.substring(0,120)));
  }
});
