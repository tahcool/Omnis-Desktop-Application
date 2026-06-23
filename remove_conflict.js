const fs = require('fs');
const file = 'systems/salestrack/index.html';
let code = fs.readFileSync(file, 'utf8');

const regex = /function setupQuickAutocomplete[\s\S]*?\/\/ Debounce Utility/m;
code = code.replace(regex, '// Debounce Utility');

fs.writeFileSync(file, code);
console.log('Removed setupQuickAutocomplete from index.html');
