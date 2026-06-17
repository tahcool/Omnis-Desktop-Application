const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

// 1. Inject the printReportContent function
const printFn = `
window.printReportContent = function(title) {
    let container = document.querySelector('.modal-content') || document.querySelector('.salestrack-modal-body');
    if (!container) {
        alert("Could not find report content.");
        return;
    }
    
    let clone = container.cloneNode(true);
    let btns = clone.querySelectorAll('button');
    btns.forEach(b => b.remove());
    let contentHTML = clone.innerHTML;

    let logoUrl = new URL('../../assets/images/omnis-logo.png', window.location.href).href;

    let win = window.open('', '_blank');
    win.document.write(\`
        <html><head><title>\${title}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .no-print { display: none !important; }
            h2 { display: none; } /* Hide the duplicate title from modal */
            .btn, button { display: none !important; }
        </style>
        </head><body>
        <div style="text-align:center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <img src="\${logoUrl}" style="height:60px; margin-bottom:15px;" />
            <h1 style="margin: 0; font-size:24px; color: #1e293b;">\${title}</h1>
            <div style="font-size:12px; color:#64748b; margin-top:8px;">Generated: \${new Date().toLocaleString()}</div>
        </div>
        \${contentHTML}
        <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
        </script>
        </body></html>
    \`);
    win.document.close();
};
`;

if (!content.includes('window.printReportContent')) {
    content += "\n" + printFn;
}

// 2. Add print button to Defects Report
content = content.replace(
    `<div style="padding:20px; background:#f8fafc;">`,
    `<div style="padding:20px; background:#f8fafc; position:relative;">
        <button onclick="window.printReportContent('Order Defects Report')" style="position:absolute; right:20px; top:20px; padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);"><i class="fas fa-print" style="margin-right:6px;"></i> Print PDF</button>`
);

// 3. Add print button to Training Report
content = content.replace(
    `<h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-user-graduate" style="color:#0891b2; margin-right:10px;"></i> Planned Operator Trainings
        </h2>`,
    `<h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-user-graduate" style="color:#0891b2; margin-right:10px;"></i> Planned Operator Trainings
            <button onclick="window.printReportContent('Planned Operator Trainings Report')" style="float:right; padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);"><i class="fas fa-print" style="margin-right:6px;"></i> Print PDF</button>
        </h2>`
);

fs.writeFileSync(jsPath, content);
console.log('Print options applied');
