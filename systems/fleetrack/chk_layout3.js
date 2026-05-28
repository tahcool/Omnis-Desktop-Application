const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf('id="view-content"');
console.log('view-content at:', idx);
console.log(JSON.stringify(c.substring(idx, idx+300)));
