const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
// Find new job card button wire-up and modal overlays
lines.forEach((l,i) => {
  if (/jc-create-modal-overlay|jc-modal-overlay|btn-new-job-card|triggerJCCreation|closeNewJobCard|closeJobCard/.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,130));
  }
});
