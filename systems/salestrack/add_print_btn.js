const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'index.html');
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /(<button id="ol-refresh-btn"[^>]+>[\s\S]*?<\/button>)/;
const printBtnHtml = `
          <button id="ol-print-btn" class="btn-secondary" onclick="if(window.printOrderTracking) window.printOrderTracking();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-left:8px;">
            <i class="fas fa-print" style="margin-right:8px;"></i> Print
          </button>`;

if (targetRegex.test(content) && !content.includes('id="ol-print-btn"')) {
    content = content.replace(targetRegex, `$1${printBtnHtml}`);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully added Print button to index.html");
} else if (content.includes('id="ol-print-btn"')) {
    console.log("Print button already exists.");
} else {
    console.log("Target refresh button not found.");
}
