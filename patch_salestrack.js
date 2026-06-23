const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "if (typeof salestrack !== 'undefined' && salestrack.openCommandCenter) salestrack.openCommandCenter(true);";
const replStr = "if (window.salestrack && window.salestrack.openCommandCenter) { console.log('Calling openCommandCenter'); window.salestrack.openCommandCenter(true); } else { console.log('salestrack.openCommandCenter not found!'); }";

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replStr);
    fs.writeFileSync(file, content);
    console.log("Patched salestrack call in index.html");
} else {
    console.log("Target string not found in index.html");
}
