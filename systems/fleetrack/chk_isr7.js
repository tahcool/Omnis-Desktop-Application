const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find the actual definition (not reference) of loadFtMachineRegister
const idx = c.indexOf('window.loadFtMachineRegister = ');
console.log('loadFtMachineRegister def at line ~'+c.substring(0,idx).split('\n').length);
lines.slice(c.substring(0,idx).split('\n').length-1, c.substring(0,idx).split('\n').length+35)
  .forEach((l,i)=>console.log((c.substring(0,idx).split('\n').length+i)+': '+l.substring(0,130)));
