const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// 1. Check line 9324 is now correct
const lines = c.split('\n');
console.log('Lines 9320-9328:');
lines.slice(9319,9327).forEach((l,i)=>console.log((9320+i)+': '+l.substring(0,100)));

// 2. Check all script blocks for errors using vm.Script
let inScript=false,blk=0,scriptStart=-1;
const scripts=[];
for(let j=0;j<lines.length;j++){
  if(!inScript&&/<script[^>]*>/.test(lines[j])&&!/src=/.test(lines[j])){inScript=true;scriptStart=j;blk++;}
  else if(inScript&&/<\/script>/.test(lines[j])){scripts.push({blk,start:scriptStart+1,end:j+1,code:lines.slice(scriptStart+1,j).join('\n')});inScript=false;}
}
console.log('\nChecking '+scripts.length+' script blocks...');
let anyError=false;
scripts.forEach(s=>{
  try{new vm.Script(s.code);}
  catch(e){
    anyError=true;
    const bl=s.code.split('\n');
    let lo=1,hi=bl.length;
    while(hi-lo>1){const mid=Math.floor((lo+hi)/2);try{new vm.Script(bl.slice(0,mid).join('\n'));lo=mid;}catch(_){hi=mid;}}
    const gl=s.start+hi-1;
    console.log('BLOCK '+s.blk+' line ~'+gl+': '+e.message);
    lines.slice(Math.max(0,gl-2),gl+3).forEach((l,i)=>console.log('  '+(gl-2+i+1)+': '+l.substring(0,110)));
  }
});
if(!anyError) console.log('All blocks: OK');
