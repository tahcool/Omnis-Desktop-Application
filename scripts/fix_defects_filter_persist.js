const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldLine = '        renderDefectsTable(FT_DEFECTS_DATA);';
const newLine = '        filterDefectsTable(); // Re-apply existing filters after data loads';

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('systems/fleetrack/index.html', content);
  console.log('Successfully updated loadFtDefects to persist filters');
} else {
  console.log('Could not find the target line in index.html');
}
