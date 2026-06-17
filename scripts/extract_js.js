const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

let scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let jsCode = '';
while ((match = scriptRegex.exec(html)) !== null) {
    jsCode += match[1] + '\n';
}

fs.writeFileSync('scripts/extracted_js.js', jsCode);
console.log('Extracted cleanly');
