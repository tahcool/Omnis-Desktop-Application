const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');

// Look at the Reports menu area around line 2871
console.log('=== Reports menu area (2868-2940) ===');
lines.slice(2867,2940).forEach((l,i)=>console.log((2868+i)+': '+l.substring(0,130)));
