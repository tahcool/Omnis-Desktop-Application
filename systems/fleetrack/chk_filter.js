const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('fleetrack_managed');
console.log('idx:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(idx-50, idx+200)));
