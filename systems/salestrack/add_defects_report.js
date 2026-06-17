const fs = require('fs');
const path = require('path');

const indexFile = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');

const printBtnRegex = /(<button id="ol-print-btn"[^>]+>[\s\S]*?<\/button>)/;
const defectsBtnHtml = `
          <button id="ol-defects-btn" class="btn-secondary" onclick="if(window.openDefectsReport) window.openDefectsReport();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-left:8px; background:#fef2f2; color:#991b1b; border:1px solid #fca5a5;">
            <i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i> Defects Report
          </button>`;

if (printBtnRegex.test(indexContent) && !indexContent.includes('id="ol-defects-btn"')) {
    indexContent = indexContent.replace(printBtnRegex, `$1${defectsBtnHtml}`);
    fs.writeFileSync(indexFile, indexContent, 'utf8');
    console.log("Added Defects Report button to index.html");
}

const ordersLogicFile = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'orders_logic.js');
let olContent = fs.readFileSync(ordersLogicFile, 'utf8');

if (!olContent.includes('window.openDefectsReport')) {
    const defectsReportFunc = `
window.openDefectsReport = function() {
    let html = \`<div style="padding:20px; background:#f8fafc;">
        <h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-exclamation-triangle" style="color:#ef4444; margin-right:10px;"></i> Order Defects Report
        </h2>
        <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em;">
                    <tr>
                        <th style="padding:16px; text-align:left; border-bottom:1px solid #e2e8f0;">Customer</th>
                        <th style="padding:16px; text-align:left; border-bottom:1px solid #e2e8f0;">Order Status</th>
                        <th style="padding:16px; text-align:left; border-bottom:1px solid #e2e8f0;">Machine / Item</th>
                        <th style="padding:16px; text-align:left; border-bottom:1px solid #e2e8f0;">Defects / Missing Items</th>
                    </tr>
                </thead>
                <tbody>\`;

    const data = window.olOrdersData || [];
    let hasDefects = false;

    data.forEach(order => {
        if (!order.machines) return;
        order.machines.forEach(m => {
            const match = (m.notes || '').match(/\\[DEFECTS\\]([\\s\\S]*?)\\[\\/DEFECTS\\]/);
            if (match && match[1].trim()) {
                hasDefects = true;
                html += \`
                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <td style="padding:16px; font-weight:700; color:#334155; vertical-align:top;">\${order.customer}</td>
                        <td style="padding:16px; vertical-align:top;">\${order.status}</td>
                        <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:top;">\${m.item_name || m.item || m.machine}</td>
                        <td style="padding:16px; color:#991b1b; background:#fef2f2; font-weight:500; border-radius:6px; margin:8px; display:block;">\${match[1].trim().replace(/\\n/g, '<br>')}</td>
                    </tr>
                \`;
            }
        });
    });

    if (!hasDefects) {
        html += \`<tr><td colspan="4" style="padding:32px; text-align:center; color:#64748b; font-size:14px; font-style:italic;">No active defects or missing items reported.</td></tr>\`;
    }

    html += \`</tbody></table></div></div>\`;
    
    if (window.salestrack && window.salestrack.openListModal) {
        window.salestrack.openListModal("Defects Report", html, "1200px");
    } else {
        alert("Defects Report Modal Error: Could not find modal functions.");
    }
};
`;
    olContent += defectsReportFunc;
    fs.writeFileSync(ordersLogicFile, olContent, 'utf8');
    console.log("Added openDefectsReport to orders_logic.js");
} else {
    console.log("window.openDefectsReport already exists");
}
