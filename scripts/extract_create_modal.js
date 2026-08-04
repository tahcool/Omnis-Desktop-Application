const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

console.log("--- MODAL HTML ---");
const start = content.indexOf('id="db-create-modal-overlay"');
console.log(content.substring(start - 50, start + 2500));

console.log("\n--- SAVE FUNCTION ---");
const saveStart = content.indexOf('function submitNewBreakdown');
if(saveStart > -1) {
    console.log(content.substring(saveStart, saveStart + 2000));
} else {
    const fnStart = content.indexOf('onclick="', start + 1000);
    console.log(content.substring(fnStart, fnStart + 500));
}
