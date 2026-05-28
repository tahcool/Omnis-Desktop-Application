const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');

// Check the machine data loading to see last_service_date field
console.log('=== last_service_date usage (lines 8670-8690) ===');
lines.slice(8669,8695).forEach((l,i)=>console.log((8670+i)+': '+l.substring(0,130)));

// Also check showView function to understand navigation pattern 
const svIdx = c.indexOf('function showView(');
console.log('\n=== showView (line ~'+c.substring(0,svIdx).split('\n').length+') first 15 lines ===');
lines.slice(c.substring(0,svIdx).split('\n').length-1, c.substring(0,svIdx).split('\n').length+15)
  .forEach((l,i)=>console.log((c.substring(0,svIdx).split('\n').length+i)+': '+l.substring(0,130)));

// Check FT Machine doctype fields from API call
const ftMachineIdx = c.indexOf('FT Machine');
console.log('\nFT Machine at line ~'+c.substring(0,ftMachineIdx).split('\n').length);
lines.slice(c.substring(0,ftMachineIdx).split('\n').length-1, c.substring(0,ftMachineIdx).split('\n').length+5)
  .forEach((l,i)=>console.log((c.substring(0,ftMachineIdx).split('\n').length+i)+': '+l.substring(0,130)));
