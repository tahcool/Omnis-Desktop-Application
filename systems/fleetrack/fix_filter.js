const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

const old3 = 'let rows = SD_ALL_ROWS.filter(r => {\r\n      if (r.fleetrack_managed === "No") return false;\r\n      if (r.working_status === "Inactive" || r.working_status === "Sold") return false;\r\n      return true;\r\n    });';
const new3 = 'let rows = SD_ALL_ROWS.filter(r => {\r\n      if (r.working_status === "Sold") return false;\r\n      return true;\r\n    });';
console.log('Found:', c.includes(old3));
c = c.replace(old3, new3);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done');
