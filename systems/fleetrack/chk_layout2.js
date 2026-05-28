const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find the main-content or content-area wrapper
['main-content','content-area','content-wrapper','app-body','main-body','view-content','page-content'].forEach(id => {
  if (c.includes(id)) console.log('FOUND:', id, 'at', c.indexOf(id));
});
// Also find the wrapper just before view-dashboard div
const idx = c.indexOf('<div id=\"view-dashboard\"');
const pre = c.substring(Math.max(0,idx-200), idx);
console.log('Before view-dashboard:', JSON.stringify(pre));
