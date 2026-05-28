const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const mainClose = c.indexOf('</main>');
// Find all occurrences of each id
let idx=0, found=[];
while((idx=c.indexOf('id="view-service-due"',idx))!==-1){found.push(idx);idx++;}
console.log('id=view-service-due occurrences:', found, found.map(i=>i<mainClose?'INSIDE':'OUTSIDE'));
found=[];idx=0;
while((idx=c.indexOf('id="view-customers"',idx))!==-1){found.push(idx);idx++;}
console.log('id=view-customers occurrences:', found, found.map(i=>i<mainClose?'INSIDE':'OUTSIDE'));
