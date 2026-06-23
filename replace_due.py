import os

file_path = "C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                return `<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage ${q.current_stage}</td>
                                    <td style="padding:10px 16px; color:#ef4444; font-weight:700; width:20%; text-align:right;">${due}</td>
                                </tr>`"""

replacement = """                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                let daysOverdue = Math.floor((new Date() - new Date(due)) / (1000 * 60 * 60 * 24));
                                let color = '#ef4444'; // standard red
                                let bg = '#fef2f2';
                                let icon = '<i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>';
                                
                                if (daysOverdue > 7) {
                                    color = '#991b1b'; // dark red
                                    bg = '#fca5a5'; // darker bg
                                    icon = '<i class="fas fa-radiation" style="margin-right:4px;"></i>';
                                } else if (daysOverdue < 3) {
                                    color = '#d97706'; // orange
                                    bg = '#fef3c7';
                                    icon = '<i class="fas fa-clock" style="margin-right:4px;"></i>';
                                }

                                return `<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage ${q.current_stage}</td>
                                    <td style="padding:10px 16px; width:20%; text-align:right;">
                                        <span style="background:${bg}; color:${color}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:800; display:inline-flex; align-items:center;">
                                            ${icon} ${due}
                                        </span>
                                    </td>
                                </tr>`"""

if target not in content:
    print("Could not find target chunk in dashboard_logic.js")
    # let's try finding a substring
    short_target = "                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);"
    print(f"Is short target in content? {short_target in content}")
    exit(1)

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESSFULLY REPLACED")
