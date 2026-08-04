const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const start = content.indexOf('function openDbrEditModal(name) {');
const end = content.indexOf('function saveDbrEdit', start); 

const funcBody = content.substring(start, end);

const matches = funcBody.match(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
let missing = [];
if (matches) {
  matches.forEach(m => {
    const match = m.match(/['"]([^'"]+)['"]/);
    if (match) {
      const id = match[1];
      if (!content.includes('id="' + id + '"') && !content.includes("id='" + id + "'")) {
        missing.push(id);
      }
    }
  });
}
console.log('Missing IDs:', missing);
