const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetStrStart = '            const emailHtml = `';
const targetStrEnd = '            `;\n\n            if (!window.electron';

const idxStart = html.indexOf(targetStrStart);
const idxEnd = html.indexOf(targetStrEnd);

if (idxStart === -1 || idxEnd === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const replacement = `            const currentDate = new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'});

            const emailHtml = \`
            <!DOCTYPE html><html><head><meta charset="utf-8"></head>
            <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
            <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
                <table style="width:100%;border-collapse:collapse;background:\${colour};" cellpadding="0" cellspacing="0"><tr>
                    <td style="padding:24px 32px;vertical-align:middle;width:45%;">
                    <img src="\${logo}" alt="\${brand}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </td>
                    <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
                    <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">\${brand}</div>
                    <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Aftersales Handover Report</div>
                    <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: \${currentDate}</div>
                    </td>
                </tr></table>

                <div style="padding:32px 32px 16px;">
                    <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
                        Dear <strong>\${customerName}</strong>,<br><br>
                        Thank you for your valued purchase! Your machine has been added to our Fleetrack Machine Management System. 
                        <strong>@MXG | Fleetrack (Bruce)</strong> and the team will be your point of contact for any aftersales queries and service requirements. 
                        A Customer Support Group (CSG) will be created where you'll be an admin, allowing you to easily add your employees to report issues or request services.
                    </p>
                </div>
                
                <div style="padding:16px 32px 36px;overflow-x:auto;">
                    <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
                        <thead>
                            <tr style="background:\${colour};">
                                <th colspan="2" style="padding:16px 20px;text-align:left;color:white;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid rgba(0,0,0,0.1);">Machine Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;width:40%;background:#f8fafc;">Machine Model</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.equipment_model || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">SN (Chassis Number)</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.chassis_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">OEM</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.oem || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Engine Number</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.engine_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Applicable</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.warranty_applicable || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Start</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.warranty_start_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty End</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">\${data.warranty_end_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;font-weight:bold;background:#f8fafc;">Service Plan</td>
                                <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;">\${data.service_plan || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
                    Please feel free to contact us with any questions or queries.<br>
                    Kind regards, <strong>\${data.sales_rep || 'Aftersales Team'}</strong><br><br>
                    This is an automated update from \${brand}. Please do not reply to this email. &copy; \${brand} &mdash; Omnis Order Management System
                </div>
            </div></body></html>
`;

html = html.substring(0, idxStart) + replacement + html.substring(idxEnd);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Update complete');
