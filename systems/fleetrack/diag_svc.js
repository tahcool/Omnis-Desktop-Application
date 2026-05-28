const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find where FT_MACHINE_ROWS is first declared in the main script
const lines = c.split('\n');
lines.forEach((l,i) => {
  if (/let FT_MACHINE_ROWS|var FT_MACHINE_ROWS|FT_MACHINE_ROWS\s*=/.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,100));
  }
});
