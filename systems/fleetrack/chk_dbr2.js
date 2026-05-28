const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('Apply Filters');
console.log('Apply Filters at:', idx);
if(idx>=0) console.log(JSON.stringify(c.substring(Math.max(0,idx-800), idx+400)));
