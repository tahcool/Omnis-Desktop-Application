const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const lines = content.split('\n');

const startIndex = 11697;
const endIndex = 11712;

const newListenerLines = [
  '      searchFab.addEventListener("click", (e) => {',
  '        e.stopPropagation();',
  '        window.electron.invoke("window:openAuxiliary", "systems/fleetrack/index.html");',
  '      });'
];

lines.splice(startIndex, endIndex - startIndex + 1, ...newListenerLines);
fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
console.log('Successfully replaced the click handler in index.html');
