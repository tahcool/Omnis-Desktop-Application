const fs = require('fs');
let html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
console.log('Count of sp-form-overlay (id):', html.split('id="sp-form-overlay"').length - 1);
console.log('Count of sp-form-overlay (general):', html.split('sp-form-overlay').length - 1);
