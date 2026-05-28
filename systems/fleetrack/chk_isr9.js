const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find FT_MACHINE_REGISTER_METHOD
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('FT_MACHINE_REGISTER_METHOD') && lines[i].includes('=')){
    console.log('FT_MACHINE_REGISTER_METHOD at line '+(i+1)+': '+lines[i].substring(0,100)); break;
  }
}
// Find last item in view-machines section to know where to insert view-isr
const vmEnd = c.lastIndexOf('view-machines');
console.log('\nlast view-machines ref at line ~'+c.substring(0,vmEnd).split('\n').length);
// Find the end of view-machines div
let depth=0,foundStart=false;
const vmStart = c.indexOf('id="view-machines"');
let pos = vmStart;
while(pos < c.length){
  if(c[pos]==='<' && c[pos+1]!='/') depth++;
  if(c[pos]==='<' && c[pos+1]==='/') depth--;
  if(foundStart && depth===0) { console.log('view-machines div ends at line ~'+c.substring(0,pos).split('\n').length); break; }
  if(depth>0) foundStart=true;
  pos++;
}
// Find end of view-reports div 
const vrStart = c.indexOf('id="view-reports"');
depth=0; foundStart=false; pos=vrStart;
while(pos < c.length){
  if(c[pos]==='<' && c[pos+1]!='/') depth++;
  if(c[pos]==='<' && c[pos+1]==='/') depth--;
  if(foundStart && depth===0) { console.log('view-reports div ends at line ~'+c.substring(0,pos).split('\n').length); break; }
  if(depth>0) foundStart=true;
  pos++;
}
