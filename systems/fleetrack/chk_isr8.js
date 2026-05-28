const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find via alternate patterns
['async function loadFtMachineRegister', 'loadFtMachineRegister = async', 'FT_MACHINE_ROWS', 'callFrappe.*FT Machine'].forEach(p=>{
  const re = new RegExp(p);
  for(let i=0;i<lines.length;i++){
    if(re.test(lines[i])){ console.log(p+' at line ~'+(i+1)+': '+lines[i].substring(0,100)); break; }
  }
});
