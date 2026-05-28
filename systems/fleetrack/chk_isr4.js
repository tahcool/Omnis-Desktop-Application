const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');

// Look at Modules dropdown for where DBR/Machine Register nav items are
const modulesIdx = c.indexOf('Modules');
console.log('Modules nav at line ~'+c.substring(0,modulesIdx).split('\n').length);
// Find where showView('view-reports') is called in nav
const svReports = c.indexOf("showView('view-reports')");
const svMachines = c.indexOf("showView('view-machines')");
console.log('showView view-reports at line ~'+c.substring(0,svReports).split('\n').length);
console.log('showView view-machines at line ~'+c.substring(0,svMachines).split('\n').length);

// Show those areas
lines.slice(c.substring(0,svReports).split('\n').length-3, c.substring(0,svReports).split('\n').length+3)
  .forEach((l,i)=>console.log((c.substring(0,svReports).split('\n').length-3+i)+': '+l.substring(0,130)));
console.log('---');
lines.slice(c.substring(0,svMachines).split('\n').length-3, c.substring(0,svMachines).split('\n').length+3)
  .forEach((l,i)=>console.log((c.substring(0,svMachines).split('\n').length-3+i)+': '+l.substring(0,130)));

// Check what FT Machine API fields include (look at the API call)
const ftmIdx = c.indexOf('\"FT Machine\"');
console.log('\nFT Machine doctype API call at line ~'+c.substring(0,ftmIdx).split('\n').length);
lines.slice(c.substring(0,ftmIdx).split('\n').length-2, c.substring(0,ftmIdx).split('\n').length+8)
  .forEach((l,i)=>console.log((c.substring(0,ftmIdx).split('\n').length-2+i)+': '+l.substring(0,130)));
