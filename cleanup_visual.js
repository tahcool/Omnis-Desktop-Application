const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "if (window.salestrack && window.salestrack.openCommandCenter) { document.getElementById('view-command-center').innerHTML += '<div style=\"background:red; color:white; font-size:30px;\">CALLED</div>'; window.salestrack.openCommandCenter(true); } else { document.getElementById('view-command-center').innerHTML += '<div style=\"background:red; color:white; font-size:30px;\">NOT FOUND</div>'; }";
const replStr = "if (window.salestrack && window.salestrack.openCommandCenter) { window.salestrack.openCommandCenter(true); }";

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replStr);
    fs.writeFileSync(file, content);
    console.log("Cleaned up visual debug from index.html");
} else {
    console.log("Visual debug string not found in index.html");
}
