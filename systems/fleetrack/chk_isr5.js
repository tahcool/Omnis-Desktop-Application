const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');

// Find the Modules dropdown content
const modMenuIdx = c.indexOf('top-nav-dropdown-menu', c.indexOf('Modules'));
console.log('Modules dropdown menu at line ~'+c.substring(0,modMenuIdx).split('\n').length);
lines.slice(c.substring(0,modMenuIdx).split('\n').length, c.substring(0,modMenuIdx).split('\n').length+35)
  .forEach((l,i)=>console.log((c.substring(0,modMenuIdx).split('\n').length+1+i)+': '+l.substring(0,130)));

// Show view-machines div start
const vmIdx = c.indexOf('id=\"view-machines\"');
console.log('\nview-machines div at line ~'+c.substring(0,vmIdx).split('\n').length);
lines.slice(c.substring(0,vmIdx).split('\n').length-1, c.substring(0,vmIdx).split('\n').length+5)
  .forEach((l,i)=>console.log((c.substring(0,vmIdx).split('\n').length+i)+': '+l.substring(0,130)));
