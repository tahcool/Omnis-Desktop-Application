const fs = require('fs');
let htmlPath = 'systems/salestrack/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

let replacement = `          <button id="ol-training-report-btn" class="btn-secondary" onclick="if(window.openTrainingReport) window.openTrainingReport();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-right:8px; background:#ecfeff; color:#0891b2; border:1px solid #a5f3fc;">
            <i class="fas fa-user-graduate" style="margin-right:8px;"></i> Training
          </button>
          <button id="ol-print-report-btn" class="btn-secondary" onclick="if(window.printMainOrdersReport) window.printMainOrdersReport();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-right:8px; background:#f8fafc; color:#334155; border:1px solid #cbd5e1;">
            <i class="fas fa-print" style="margin-right:8px;"></i> Print
          </button>
          <button id="ol-refresh-btn" class="btn-secondary"`;

let regex = /<button id="ol-refresh-btn" class="btn-secondary"/;

if (content.includes('id="ol-training-report-btn"')) {
    console.log("Buttons already exist.");
} else if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(htmlPath, content);
    console.log("Buttons added successfully via regex.");
} else {
    console.log("Target not found.");
}
