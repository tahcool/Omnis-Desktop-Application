const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');
const lines = html.split('\n');
const start = lines.findIndex(l => l.includes('id="view-settings"'));
if (start !== -1) {
    fs.writeFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\settings_dump.txt', lines.slice(start, start + 300).join('\n'), 'utf8');
    console.log("Dumped 300 lines of settings view");
}
