const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const start = content.indexOf('id="db-create-modal-overlay"');
console.log(content.substring(start + 2000, start + 4500));
