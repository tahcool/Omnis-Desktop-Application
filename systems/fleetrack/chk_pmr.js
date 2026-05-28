const fs=require('fs');
const c=fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines=c.split('\n');
// Search for printMachineRegister definition
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('printMachineRegister') && (lines[i].includes('function') || lines[i].includes('=>') || lines[i].includes('{'))) {
    console.log((i+1)+': '+lines[i].substring(0,120));
  }
}
// Also check what comes before printJobCard
const pjc=c.indexOf('window.printJobCard = function');
console.log('\nprintJobCard def at line ~'+c.substring(0,pjc).split('\n').length);
lines.slice(c.substring(0,pjc).split('\n').length-6,c.substring(0,pjc).split('\n').length+2)
  .forEach((l,i)=>console.log((c.substring(0,pjc).split('\n').length-6+i)+': '+l.substring(0,120)));
