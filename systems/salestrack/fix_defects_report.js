const fs = require('fs');
const path = require('path');

const ordersLogicFile = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'orders_logic.js');
let olContent = fs.readFileSync(ordersLogicFile, 'utf8');

// Replace the entire window.openDefectsReport function
const oldFuncRegex = /window\.openDefectsReport = function\(\) \{[\s\S]*?\};\n/;

const newFunc = `
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

    // FIX: use olOrdersData directly (it's in the same scope)
    const data = typeof olOrdersData !== 'undefined' ? olOrdersData : [];
    let hasDefects = false;

    data.forEach(order => {
        if (!order.machines) return;
        order.machines.forEach(m => {
            const match = (m.notes || '').match(/\\[DEFECTS\\]([\\s\\S]*?)\\[\\/DEFECTS\\]/);
            if (match && match[1].trim()) {
                hasDefects = true;
                
                // Parse defects into a list
                let rawDefects = match[1].trim().split('\\n').filter(l => l.trim());
                let defectHtml = '';
                
                if (rawDefects.length > 2) {
                    defectHtml = '<ul style="margin:0; padding-left:20px;">';
                    defectHtml += '<li>' + rawDefects[0] + '</li>';
                    defectHtml += '<li>' + rawDefects[1] + '</li>';
                    defectHtml += '</ul>';
                    defectHtml += \`<div style="font-size:11px; font-weight:bold; color:#b91c1c; cursor:pointer; margin-top:6px;" onclick="alert('\${match[1].trim().replace(/\\n/g, '\\\\n').replace(/'/g, "\\\\'")}')">View more (+\${rawDefects.length - 2})...</div>\`;
                } else if (rawDefects.length > 1) {
                    defectHtml = '<ul style="margin:0; padding-left:20px;">' + rawDefects.map(d => '<li>' + d + '</li>').join('') + '</ul>';
                } else {
                    defectHtml = rawDefects[0];
                }
                
                html += \`
                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <td style="padding:16px; font-weight:700; color:#334155; vertical-align:top; width:20%;">\${order.customer}</td>
                        <td style="padding:16px; vertical-align:top; width:15%;">
                            <span style="background:#e2e8f0; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">\${order.status}</span>
                        </td>
                        <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:top; width:25%;">\${m.item_name || m.item || m.machine}</td>
                        <td style="padding:16px; color:#991b1b; background:#fef2f2; font-weight:500; vertical-align:top;">\${defectHtml}</td>
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

if (oldFuncRegex.test(olContent)) {
    olContent = olContent.replace(oldFuncRegex, newFunc);
    fs.writeFileSync(ordersLogicFile, olContent, 'utf8');
    console.log("Successfully updated openDefectsReport in orders_logic.js");
} else {
    console.log("Regex failed to match existing function.");
}
