const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Get the last <th> in the job card thead
const idx = c.indexOf('job-card-table');
const slice = c.substring(idx, idx+2000);
console.log(JSON.stringify(slice.substring(1000)));
