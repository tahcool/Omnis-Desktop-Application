const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let html = fs.readFileSync(file, 'utf8');

const startIdx = html.indexOf('<!-- COMMAND CENTER VIEW (Relocated to root) -->');
const endIdx = html.indexOf('<!-- NEW CHAT VIEW -->');

if (startIdx !== -1 && endIdx !== -1) {
    const commandCenterHtml = html.substring(startIdx, endIdx);
    
    // Remove it from its current location
    html = html.substring(0, startIdx) + html.substring(endIdx);
    
    // Find the end of main-view-container
    // We know main-view-container ends right before "<!-- COMMAND CENTER VIEW (Relocated to root) -->" wait no.
    // Let's just insert it right after `<div id="chart-error" style="margin:0 20px;"></div>` which is inside main-view-container
    const insertAfter = '<div id="chart-error" style="margin:0 20px;"></div>';
    const insertIdx = html.indexOf(insertAfter);
    
    if (insertIdx !== -1) {
        html = html.substring(0, insertIdx + insertAfter.length) + '\n' + commandCenterHtml + '\n' + html.substring(insertIdx + insertAfter.length);
        fs.writeFileSync(file, html);
        console.log("Moved command center inside main-view-container!");
    } else {
        console.log("Could not find insertion point.");
    }
} else {
    console.log("Could not find start/end bounds.");
}
