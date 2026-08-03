const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const lines = content.split('\n');

const newLines = [
  '        const defects = (sbRes?.data || []).filter(d => {',
  '            const st = (d.status || "").toLowerCase();',
  '            return st === "open";',
  '        });'
];

lines.splice(14913, 4, ...newLines);
fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
console.log('Successfully updated defect filter in index.html');
