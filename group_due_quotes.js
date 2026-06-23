const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add company to query
content = content.replace(
    `columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date)'`,
    `columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date, company)'`
);

// 2. Replace globalDueHtml rendering
const startStr = "let globalDueHtml = `<div style=\"color:#94a3b8; font-size:14px; text-align:center; padding:30px;\">No quotes are currently due for follow-up!</div>`;";
const endStr = "        let pendingApprovalsHtml = '';";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `
        let globalDueHtml = \`<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes are currently due for follow-up!</div>\`;
        if (dueQuotes && dueQuotes.length > 0) {
            // Group by company
            let companyGroups = {};
            dueQuotes.forEach(q => {
                let comp = (q.frappe_quotation && q.frappe_quotation.company) ? q.frappe_quotation.company : 'Unknown Company';
                if (!companyGroups[comp]) companyGroups[comp] = [];
                companyGroups[comp].push(q);
            });
            
            globalDueHtml = Object.entries(companyGroups).map(([company, quotes]) => {
                return \`
                <div style="margin-bottom:16px;">
                    <div style="background:#f1f5f9; padding:8px 16px; font-weight:800; font-size:12px; color:#475569; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
                        \${company} <span style="margin-left:8px; background:#e2e8f0; padding:2px 8px; border-radius:12px; font-size:10px;">\${quotes.length} Due</span>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <tbody>
                            \${quotes.map(q => {
                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                return \`<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('\${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">\${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">\${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage \${q.current_stage}</td>
                                    <td style="padding:10px 16px; color:#ef4444; font-weight:700; width:20%; text-align:right;">\${due}</td>
                                </tr>\`
                            }).join('')}
                        </tbody>
                    </table>
                </div>\`;
            }).join('');
        }

`;
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Updated globalDueHtml successfully!");
} else {
    console.error("Could not find globalDueHtml bounds");
}
