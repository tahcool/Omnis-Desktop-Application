const fs = require('fs');

// 1. Update index.html
let htmlPath = 'systems/salestrack/index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const refreshBtnStart = '<button id="ol-refresh-btn" class="btn-secondary"';
const printBtnHtml = `
            <button id="ol-print-main-btn" class="btn-secondary" onclick="if(window.printMainOrdersReport) window.printMainOrdersReport();"
              style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-right:8px; background:#f8fafc; color:#0f172a; border:1px solid #e2e8f0;">
              <i class="fas fa-print" style="margin-right:8px;"></i> Print List
            </button>
            <button id="ol-refresh-btn" class="btn-secondary"`;

if (!htmlContent.includes('ol-print-main-btn')) {
    htmlContent = htmlContent.replace(refreshBtnStart, printBtnHtml);
    fs.writeFileSync(htmlPath, htmlContent);
}

// 2. Update orders_logic.js
let jsPath = 'systems/salestrack/orders_logic.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Expose rows globally
const paginationComment = '// 3. Pagination';
const newPaginationComment = 'window.olFilteredRows = rows;\n      // 3. Pagination';
if (!jsContent.includes('window.olFilteredRows = rows;')) {
    jsContent = jsContent.replace(paginationComment, newPaginationComment);
}

// Add printMainOrdersReport function
const printFn = `
window.printMainOrdersReport = function() {
    const rows = window.olFilteredRows || [];
    if (rows.length === 0) {
        alert("No records to print based on current filters.");
        return;
    }

    let logoUrl = new URL('../../assets/images/omnis-logo.png', window.location.href).href;
    const companyEl = document.getElementById("ol-company");
    const selectedCompany = companyEl && companyEl.options[companyEl.selectedIndex] ? companyEl.options[companyEl.selectedIndex].text : "All Companies";

    let tableHtml = \`
        <table>
            <thead>
                <tr>
                    <th style="width:15%;">Report ID</th>
                    <th style="width:25%;">Customer</th>
                    <th style="width:30%;">Machinery Details</th>
                    <th style="width:15%;">Status</th>
                    <th style="width:15%;">Handover</th>
                </tr>
            </thead>
            <tbody>
    \`;

    for (let r of rows) {
        let machines = (r.machines || []).map(m => \`<div>\${m.item_name || m.item_code} (\${m.qty})</div>\`).join('');
        if (!machines) machines = r.items_summary || '-';

        let statusColor = '#64748b';
        if (r.status === 'Pre-Delivery') statusColor = '#d97706';
        if (r.status === 'Delivered') statusColor = '#10b981';

        tableHtml += \`
            <tr>
                <td style="font-weight:700;">\${r.report_id}</td>
                <td style="font-weight:600; color:#334155;">\${r.customer}</td>
                <td style="color:#475569;">\${machines}</td>
                <td style="font-weight:700; color:\${statusColor};">\${r.status}</td>
                <td style="color:#0f172a;">\${r.handover_date ? r.handover_date : '-'}</td>
            </tr>
        \`;
    }
    tableHtml += \`</tbody></table>\`;

    let win = window.open('', '_blank');
    win.document.write(\`
        <html><head><title>Orders Report</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; color:#475569; }
            .no-print { display: none !important; }
        </style>
        </head><body>
        <div style="text-align:center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <img src="\${logoUrl}" style="height:60px; margin-bottom:15px;" />
            <h1 style="margin: 0; font-size:24px; color: #1e293b;">Active Orders Report</h1>
            <div style="font-size:14px; font-weight:600; color:#475569; margin-top:8px;">Filtered By: \${selectedCompany}</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">Generated: \${new Date().toLocaleString()} | \${rows.length} Records</div>
        </div>
        \${tableHtml}
        <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
        </script>
        </body></html>
    \`);
    win.document.close();
};
`;

if (!jsContent.includes('window.printMainOrdersReport')) {
    jsContent += "\n" + printFn;
    fs.writeFileSync(jsPath, jsContent);
}

console.log('Main Print button and logic added');
