const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');

const start = html.indexOf('<div id="view-settings"');
const end = html.indexOf('<!-- END SETTINGS VIEW -->', start);

if (start !== -1 && end !== -1) {
    fs.writeFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\settings_dump.txt', html.substring(start, end), 'utf8');
    console.log("Dumped settings view");
} else {
    console.log("Could not find bounds");
}
