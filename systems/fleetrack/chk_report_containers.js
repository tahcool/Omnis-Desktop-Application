const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find DBR print button context (which container wraps it)
const idx = c.indexOf('btn-print-dbr');
const line = c.substring(0,idx).split('\n').length;
console.log('btn-print-dbr at line ~'+line);
// Show surrounding 10 lines
lines.slice(line-8, line+5).forEach((l,i)=>console.log((line-8+i+1)+': '+l.substring(0,120)));

// Find view-reports start
const vr = c.indexOf('id="view-reports"');
console.log('\nview-reports at line ~'+c.substring(0,vr).split('\n').length);

// Find any explicit dbr-content container
['dbr-content','dbr-main','dbr-container','dbr-wrap','report-content','report-main'].forEach(id=>{
  const i2 = c.indexOf('"'+id+'"');
  if(i2>=0) console.log(id+' at line ~'+c.substring(0,i2).split('\n').length);
});
