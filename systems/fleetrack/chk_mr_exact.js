const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find new machine button
const idx = c.indexOf('Register a new machine');
if(idx>=0) console.log('MR new btn:', JSON.stringify(c.substring(idx-10, idx+120)));
// Find filter-bar in print CSS
const idx2 = c.indexOf('.filter-bar');
if(idx2>=0) console.log('filter-bar CSS:', JSON.stringify(c.substring(Math.max(0,idx2-80), idx2+120)));
