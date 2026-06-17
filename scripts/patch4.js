const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

// Patch openDefectsReport
content = content.replace(
    "let defects = res.data;",
    `let defects = res.data;
    
    // Filter by Company dropdown if active
    const companyEl = document.getElementById("ol-company");
    const selectedCompany = companyEl ? companyEl.value : "";
    if (selectedCompany && selectedCompany.toLowerCase() !== "all" && selectedCompany.trim() !== "") {
        if (window.olOrdersData) {
            const validOrderIds = new Set(window.olOrdersData.map(o => o.report_id));
            defects = defects.filter(d => validOrderIds.has(d.order_id));
        }
    }`
);

// Patch openTrainingReport
content = content.replace(
    "let trainings = res.data;",
    `let trainings = res.data;
    
    // Filter by Company dropdown if active
    const tCompanyEl = document.getElementById("ol-company");
    const tSelectedCompany = tCompanyEl ? tCompanyEl.value : "";
    if (tSelectedCompany && tSelectedCompany.toLowerCase() !== "all" && tSelectedCompany.trim() !== "") {
        if (window.olOrdersData) {
            const validOrderIds = new Set(window.olOrdersData.map(o => o.report_id));
            trainings = trainings.filter(t => validOrderIds.has(t.order_id));
        }
    }`
);

fs.writeFileSync(jsPath, content);
console.log('Patched report functions for company filtering');
