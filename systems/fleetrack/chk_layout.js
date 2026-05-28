const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the main content area wrapper
const idx = c.indexOf('view-dashboard');
const pre = c.substring(Math.max(0,idx-400), idx);
console.log(JSON.stringify(pre));
