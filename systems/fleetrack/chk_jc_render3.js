const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Search for where the job card table tbody is rendered
const patterns = ['jc-tbody','jcTbody','job-card-table','renderJobCard','displayJobCard'];
patterns.forEach(p => {
  const idx = c.indexOf(p);
  if(idx>=0) {
    const line = c.substring(0,idx).split('\n').length;
    console.log(p+' at line ~'+line+':', JSON.stringify(c.substring(idx,idx+160)));
  }
});
