const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const lines = content.split('\n');

const newLines = [
  '        // Filter based on end_date (if no end_date, it is open)',
  '        const defects = (sbRes?.data || []).filter(d => {',
  '            return !d.end_date || String(d.end_date).trim() === "";',
  '        });'
];

lines.splice(14912, 5, ...newLines);
fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
console.log('Successfully updated defect filter to use end_date');
