const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
let inScript=false,blk=0,scriptStart=-1;
const scripts=[];
for(let j=0;j<lines.length;j++){
  if(!inScript&&/<script[^>]*>/.test(lines[j])&&!/src=/.test(lines[j])){inScript=true;scriptStart=j;blk++;}
  else if(inScript&&/<\/script>/.test(lines[j])){scripts.push({blk,start:scriptStart+1,end:j+1,code:lines.slice(scriptStart+1,j).join('\n')});inScript=false;}
}
console.log('Script blocks:', scripts.length);
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
    lines.slice(Math.max(0,gl-2),gl+3).forEach((l,i)=>console.log('  '+(gl-2+i+1)+': '+l.substring(0,120)));
  }
});
if(!anyError) console.log('All blocks OK');
// Also verify key function presence
['captureStyledHTML','openReportPrintModal','printDBR','printMachineRegister','printJobCard'].forEach(fn => {
  const found = c.indexOf('window.'+fn) >= 0 || c.indexOf('function '+fn) >= 0;
  console.log(fn+':', found ? 'FOUND' : 'MISSING');
});
