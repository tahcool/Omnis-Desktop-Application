const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');

// Find the rpt CSS block
const start = html.indexOf('.rpt-view-wrap {');
if (start === -1) { console.log('CSS NOT FOUND'); process.exit(1); }
const end = html.indexOf('/* END RPT STYLES */', start);
const cssBlock = html.substring(start, end !== -1 ? end + 20 : start + 3000);
console.log('=== RPT CSS BLOCK ===');
console.log(cssBlock.substring(0, 3000));
