const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');

const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const scriptContent = match[1];
    try {
        new Function(scriptContent);
    } catch (e) {
        console.error("Syntax error in script block " + count + ":", e.message);
        const lines = scriptContent.split('\n');
        // We can't easily find the exact line without a real parser, but let's see if an error is thrown.
    }
}
console.log("Checked " + count + " script blocks.");
