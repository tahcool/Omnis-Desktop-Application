const fs = require('fs');
const html = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', 'utf8');
const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id="view-job-cards"')) {
    console.log('view-job-cards at line', i+1);
  }
  if (lines[i].includes('id="db-create-modal-overlay"')) {
    console.log('db-create-modal-overlay at line', i+1);
  }
}
