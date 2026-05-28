const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find where job cards render rows in the table and set current row
['renderJobCards','renderJcTable','jcRows','jcRow','JC_ROWS','job_card','jc.name','openJobCard'].forEach(s => {
  const idx = c.indexOf(s);
  if(idx>=0) console.log(s+' at line ~'+(c.substring(0,idx).split('\n').length)+': '+JSON.stringify(c.substring(idx,idx+80)));
});
