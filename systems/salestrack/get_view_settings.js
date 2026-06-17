const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');

const startIndex = html.indexOf('<div id="view-settings"');
if (startIndex !== -1) {
    console.log(html.substring(startIndex, startIndex + 1000));
} else {
    console.log("NOT FOUND");
}
