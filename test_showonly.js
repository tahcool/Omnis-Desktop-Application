const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Administrator/omnis/systems/salestrack/index.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('viewId === "view-command-center"'));
if (idx !== -1) {
    console.log(lines.slice(idx-2, idx+10).join('\n'));
} else {
    console.log("NOT FOUND");
}
