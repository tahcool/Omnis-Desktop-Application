const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "async openCommandCenter(isFullView = false) {\n        if (!isFullView) {";
const replStr = "async openCommandCenter(isFullView = false) {\n        console.log('openCommandCenter executing with isFullView=' + isFullView);\n        if (!isFullView) {";

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replStr);
    fs.writeFileSync(file, content);
    console.log("Patched openCommandCenter with console.log");
} else {
    console.log("Target string not found in dashboard_logic.js");
}
