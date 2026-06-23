const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const targetHtmlStr = \`<div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#fef2f2; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                                </h3>
                                <div style="font-size:11px; font-weight:800; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:12px;">\${dueQuotes ? dueQuotes.length : 0} Quotes Due</div>
                            </div>
                            <div style="max-height: 350px; overflow-y: auto;">
                                \${globalDueHtml}
                            </div>\`;

const replacementHtmlStr = \`<div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#fef2f2; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                                </h3>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <select id="cc_filter_company" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:4px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;">
                                        <option value="">All Companies</option>
                                        <option value="Sinopower">Sinopower</option>
                                        <option value="Machinery Exchange">Machinery Exchange</option>
                                    </select>
                                    <input type="date" id="cc_filter_date_from" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="From Date">
                                    <input type="date" id="cc_filter_date_to" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="To Date">
                                    <div id="cc_due_count_badge" style="font-size:11px; font-weight:800; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:12px; margin-left:10px;">\${dueQuotes ? dueQuotes.length : 0} Quotes Due</div>
                                </div>
                            </div>
                            <div id="cc_global_due_container" style="max-height: 350px; overflow-y: auto;">
                                \${globalDueHtml}
                            </div>\`;

content = content.replace(targetHtmlStr, replacementHtmlStr);

if (!content.includes('applyCommandCenterFilters()')) {
    const methodStr = \`
    applyCommandCenterFilters() {
        if (!this.cachedCommandCenterData) return;
        
        const companyFilter = document.getElementById('cc_filter_company')?.value || '';
        const dateFrom = document.getElementById('cc_filter_date_from')?.value || '';
        const dateTo = document.getElementById('cc_filter_date_to')?.value || '';
        
        let filteredDue = this.cachedCommandCenterData.dueQuotes || [];
        
        if (companyFilter) {
            filteredDue = filteredDue.filter(q => q.frappe_quotation && q.frappe_quotation.company === companyFilter);
        }
        
        if (dateFrom || dateTo) {
            filteredDue = filteredDue.filter(q => {
                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                if (dateFrom && due < dateFrom) return false;
                if (dateTo && due > dateTo) return false;
                return true;
            });
        }
        
        let html = \\\`<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes match the selected filters!</div>\\\`;
        
        if (filteredDue.length > 0) {
            let companyGroups = {};
            filteredDue.forEach(q => {
                let comp = (q.frappe_quotation && q.frappe_quotation.company) ? q.frappe_quotation.company : 'Unknown Company';
                if (!companyGroups[comp]) companyGroups[comp] = [];
                companyGroups[comp].push(q);
            });
            
            html = Object.entries(companyGroups).map(([company, quotes]) => {
                return \\\`
                <div style="margin-bottom:16px;">
                    <div style="background:#f1f5f9; padding:8px 16px; font-weight:800; font-size:12px; color:#475569; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
                        \\\${company} <span style="margin-left:8px; background:#e2e8f0; padding:2px 8px; border-radius:12px; font-size:10px;">\\\${quotes.length} Due</span>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <tbody>
                            \\\${quotes.map(q => {
                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                return \\\`<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('\\\${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">\\\${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">\\\${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage \\\${q.current_stage}</td>
                                    <td style="padding:10px 16px; color:#ef4444; font-weight:700; width:20%; text-align:right;">\\\${due}</td>
                                </tr>\\\`
                            }).join('')}
                        </tbody>
                    </table>
                </div>\\\`;
            }).join('');
        }
        
        const container = document.getElementById('cc_global_due_container');
        if (container) container.innerHTML = html;
        
        const badge = document.getElementById('cc_due_count_badge');
        if (badge) badge.innerText = filteredDue.length + ' Quotes Due';
    }
    
    renderCommandCenter(data, isFullView) {\`;
    
    content = content.replace('    renderCommandCenter(data, isFullView) {', methodStr);
}

fs.writeFileSync(file, content);
console.log("Injected filters successfully");
