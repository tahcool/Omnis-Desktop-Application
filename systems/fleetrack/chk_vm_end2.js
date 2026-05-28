const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find the Defects View comment which comes after view-machines
const defIdx = c.indexOf('<!-- Defects View');
console.log('Defects View comment at line ~'+c.substring(0,defIdx).split('\n').length);
lines.slice(c.substring(0,defIdx).split('\n').length-5,c.substring(0,defIdx).split('\n').length+3)
  .forEach((l,i)=>console.log((c.substring(0,defIdx).split('\n').length-5+i)+': '+l.substring(0,100)));
