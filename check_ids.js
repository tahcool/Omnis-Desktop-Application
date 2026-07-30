const fs = require('fs');
const html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
console.log('sp-model-input in file?', html.includes('sp-model-input'));
console.log('sp-oem in file?', html.includes('sp-oem'));
