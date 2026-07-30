const fs = require('fs');
let html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
html = html.replace(
  'window.closeStockPipelineForm = function () {',
  'window.closeStockPipelineForm = function () { console.trace("[Stock] closeStockPipelineForm called!");'
);
fs.writeFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', html, 'utf-8');
console.log('Added trace');
