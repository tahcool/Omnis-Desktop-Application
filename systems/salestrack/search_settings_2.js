const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');
const lines = html.split('\n');
const matches = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('view-settings')) {
        matches.push(`${i+1}: ${lines[i].trim()}`);
    }
}
console.log(matches.join('\n'));
