const fs = require('fs');
const lines = fs.readFileSync('systems/fleetrack/index.html', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('id="sts-model"'));
console.log(lines.slice(start-10, start + 30).join('\n'));
