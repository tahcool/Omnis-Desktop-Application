const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find what view comes after view-machines in the HTML
const vmIdx = c.indexOf('id="view-machines"');
const nextViewIdx = c.indexOf('class="view-page hidden"', vmIdx+50);
console.log('Next view-page after view-machines at line ~'+c.substring(0,nextViewIdx).split('\n').length);
lines.slice(c.substring(0,nextViewIdx).split('\n').length-3,c.substring(0,nextViewIdx).split('\n').length+3)
  .forEach((l,i)=>console.log((c.substring(0,nextViewIdx).split('\n').length-3+i)+': '+l.substring(0,120)));
