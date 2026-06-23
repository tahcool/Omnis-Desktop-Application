const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/omnis/systems/salestrack/index.html', 'utf8');
const idx = html.indexOf('id="view-command-center"');
if (idx !== -1) {
    console.log(html.substring(idx-100, idx+500));
} else {
    console.log('NOT FOUND');
}
