const fs = require('fs');
let html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
const index = html.indexOf('id="sp-form-overlay"');
console.log(html.substring(index - 500, index + 200));
