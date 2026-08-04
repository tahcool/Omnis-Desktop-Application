const fs = require('fs');
const html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const start = html.indexOf('id="view-reports"');
console.log(html.substring(start, start + 8000));
