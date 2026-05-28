const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('openJobCardDetail');
console.log('openJobCardDetail at:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(idx, idx+500)));
