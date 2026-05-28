const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find where the job card modal is opened - look for openJCModal or similar
['openJCModal','jc-modal','openJobCard','CURRENT_JC_ROW','currentJcRow'].forEach(s => {
  const idx = c.indexOf(s);
  if(idx>=0) console.log(s+' at:', idx, JSON.stringify(c.substring(idx, idx+120)));
});
