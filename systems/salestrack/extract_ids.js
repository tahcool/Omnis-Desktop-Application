const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');

// Extract all div tags with id to see the top-level structure
const regex = /<div\s+id="([^"]+)"[^>]*>/g;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null && count < 100) {
    console.log(match[0]);
    count++;
}
