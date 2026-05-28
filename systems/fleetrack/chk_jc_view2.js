const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const idx = c.indexOf("openJobCardDetail('\')");
const chunk = c.substring(idx-10, idx+400);
console.log(JSON.stringify(chunk));
