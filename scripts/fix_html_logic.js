const fs = require('fs');

let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// 1. First, we fix the broken button:
// It looks like: <button id="as-email-btn" onclick="    // ── Print Form Logic ──
// ...
//         window.sendAftersalesEmail

// The problem is my restore script replaced the FIRST "window.sendAftersalesEmail" which was inside the onclick of the button.
// And it was replaced by: printLogic
// But printLogic ends with "window.sendAftersalesEmail"

// So I can replace the exact printLogic string inside the onclick back with just "window.sendAftersalesEmail"
const printLogic = `    // ── Print Form Logic ──
    window.printAftersalesForm = function() {
        const data = gatherFormData();
        
        let logoHtml = '<img src="assets/Omnis-logo.png" style="height:60px;" />';
        if (data.company === 'Machinery Exchange') {
            logoHtml = '<img src="assets/me_logo.png" style="height:60px;" onerror="this.src=\\'assets/Omnis-logo.png\\'" />';
        } else if (data.company === 'Sinopower') {
            logoHtml = '<img src="assets/sinopower_logo.png" style="height:60px;" onerror="this.src=\\'assets/Omnis-logo.png\\'" />';
        }

        const printWindow = window.open('', '_blank');
        const boolText = (v) => v === 'Yes' ? 'Yes' : 'No';

        printWindow.document.write(\`
            <html>
            <head>
                <title>Aftersales Handover Form</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 16px; font-weight: 800; color: #0ea5e9; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
                    .row { display: flex; flex-direction: column; margin-bottom: 12px; }
                    .label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
                    .value { font-size: 14px; font-weight: 600; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; min-height: 20px; }
                    
                    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
                    .check-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; }
                    .check-label { font-size: 13px; font-weight: 600; }
                    .check-box { width: 20px; height: 20px; border: 2px solid #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
                    .check-box.yes { border-color: #10b981; color: #10b981; }
                    
                    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
                    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; }
                    .sig-name { font-size: 14px; font-weight: 600; color: #0f172a; }
                    .sig-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
                    .sig-date { font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">Handover Document</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px; font-weight:600;">Record ID: \${data.id || 'N/A'}</div>
                    </div>
                    <div>\${logoHtml}</div>
                </div>

                <div class="section">
                    <div class="section-title">Customer Information</div>
                    <div class="grid">
                        <div class="row"><div class="label">Company Name</div><div class="value">\${data.company || ''}</div></div>
                        <div class="row"><div class="label">Contact Person</div><div class="value">\${data.contact_person || ''}</div></div>
                        <div class="row"><div class="label">Phone / Cell</div><div class="value">\${data.cell_number || ''}</div></div>
                        <div class="row"><div class="label">Email Address</div><div class="value">\${data.email_address || ''}</div></div>
                        <div class="row" style="grid-column: 1 / -1;"><div class="label">Address</div><div class="value">\${data.address || ''}</div></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Machine Details</div>
                    <div class="grid">
                        <div class="row"><div class="label">OEM</div><div class="value">\${data.oem || ''}</div></div>
                        <div class="row"><div class="label">Equipment Model</div><div class="value">\${data.equipment_model || ''}</div></div>
                        <div class="row"><div class="label">Chassis Number</div><div class="value">\${data.chassis_number || ''}</div></div>
                        <div class="row"><div class="label">Engine Number</div><div class="value">\${data.engine_number || ''}</div></div>
                        <div class="row"><div class="label">Transmission Type</div><div class="value">\${data.transmission_type || ''}</div></div>
                        <div class="row"><div class="label">Axle Type</div><div class="value">\${data.axle_type || ''}</div></div>
                        <div class="row"><div class="label">Location</div><div class="value">\${data.location || ''}</div></div>
                        <div class="row"><div class="label">Date of Sale</div><div class="value">\${data.date_of_sale || ''}</div></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Warranty & Service</div>
                    <div class="grid">
                        <div class="row"><div class="label">Warranty Applicable</div><div class="value">\${data.warranty_applicable || ''}</div></div>
                        <div class="row"><div class="label">Service Plan</div><div class="value">\${data.service_plan || ''}</div></div>
                        <div class="row"><div class="label">Warranty Start Date</div><div class="value">\${data.warranty_start_date || ''}</div></div>
                        <div class="row"><div class="label">Warranty End Date</div><div class="value">\${data.warranty_end_date || ''}</div></div>
                    </div>
                </div>

                <div class="section" style="page-break-inside: avoid;">
                    <div class="section-title">Handover Checklist</div>
                    <div class="checklist-grid">
                        <div class="check-item"><span class="check-label">Loaded on Pop Register</span><div class="check-box \${data.pop_register === 'Yes' ? 'yes' : ''}">\${data.pop_register === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Machine Data Plate Photo</span><div class="check-box \${data.photos_machine_plate === 'Yes' ? 'yes' : ''}">\${data.photos_machine_plate === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Engine Data Plate Photo</span><div class="check-box \${data.photos_engine_plate === 'Yes' ? 'yes' : ''}">\${data.photos_engine_plate === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">EPR Update</span><div class="check-box \${data.epr_update === 'Yes' ? 'yes' : ''}">\${data.epr_update === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Warranty Cert Given</span><div class="check-box \${data.warranty_cert === 'Yes' ? 'yes' : ''}">\${data.warranty_cert === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Service Checklist</span><div class="check-box \${data.service_checklist === 'Yes' ? 'yes' : ''}">\${data.service_checklist === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Machine Condition Sign-off</span><div class="check-box \${data.machine_status === 'Yes' ? 'yes' : ''}">\${data.machine_status === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Invoice Copy Uploaded</span><div class="check-box \${data.invoice_copy === 'Yes' ? 'yes' : ''}">\${data.invoice_copy === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Client Satisfaction Confirm</span><div class="check-box \${data.client_satisfaction === 'Yes' ? 'yes' : ''}">\${data.client_satisfaction === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Delivery Note Copy</span><div class="check-box \${data.delivery_note === 'Yes' ? 'yes' : ''}">\${data.delivery_note === 'Yes' ? '✓' : ''}</div></div>
                    </div>
                </div>

                <div class="section" style="page-break-inside: avoid;">
                    <div class="section-title">Sign-Offs</div>
                    <div class="sig-grid">
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.sales_rep || '___________________________'}</div>
                                <div class="sig-title">Sales Representative</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.pdi_mgr || '___________________________'}</div>
                                <div class="sig-title">PDI Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.workshop_mgr || '___________________________'}</div>
                                <div class="sig-title">Workshop Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.ops_mgr || '___________________________'}</div>
                                <div class="sig-title">Operations Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                    </div>
                </div>

            </body>
            </html>
        \`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    window.sendAftersalesEmail`;

html = html.replace(printLogic, "window.sendAftersalesEmail");

// 2. Now put the print logic where it actually belongs!
// Which is in the JS section, right before window.sendAftersalesEmail = function() {
const jsLocationTarget = `    window.sendAftersalesEmail = function() {`;

// We inject printLogic WITHOUT the ending window.sendAftersalesEmail part.
const purePrintLogic = `    // ── Print Form Logic ──
    window.printAftersalesForm = function() {
        const data = gatherFormData();
        
        let logoHtml = '<img src="assets/Omnis-logo.png" style="height:60px;" />';
        if (data.company === 'Machinery Exchange') {
            logoHtml = '<img src="assets/me_logo.png" style="height:60px;" onerror="this.src=\\'assets/Omnis-logo.png\\'" />';
        } else if (data.company === 'Sinopower') {
            logoHtml = '<img src="assets/sinopower_logo.png" style="height:60px;" onerror="this.src=\\'assets/Omnis-logo.png\\'" />';
        }

        const printWindow = window.open('', '_blank');
        const boolText = (v) => v === 'Yes' ? 'Yes' : 'No';

        printWindow.document.write(\`
            <html>
            <head>
                <title>Aftersales Handover Form</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 16px; font-weight: 800; color: #0ea5e9; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
                    .row { display: flex; flex-direction: column; margin-bottom: 12px; }
                    .label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
                    .value { font-size: 14px; font-weight: 600; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; min-height: 20px; }
                    
                    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
                    .check-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; }
                    .check-label { font-size: 13px; font-weight: 600; }
                    .check-box { width: 20px; height: 20px; border: 2px solid #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
                    .check-box.yes { border-color: #10b981; color: #10b981; }
                    
                    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
                    .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; }
                    .sig-name { font-size: 14px; font-weight: 600; color: #0f172a; }
                    .sig-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
                    .sig-date { font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">Handover Document</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px; font-weight:600;">Record ID: \${data.id || 'N/A'}</div>
                    </div>
                    <div>\${logoHtml}</div>
                </div>

                <div class="section">
                    <div class="section-title">Customer Information</div>
                    <div class="grid">
                        <div class="row"><div class="label">Company Name</div><div class="value">\${data.company || ''}</div></div>
                        <div class="row"><div class="label">Contact Person</div><div class="value">\${data.contact_person || ''}</div></div>
                        <div class="row"><div class="label">Phone / Cell</div><div class="value">\${data.cell_number || ''}</div></div>
                        <div class="row"><div class="label">Email Address</div><div class="value">\${data.email_address || ''}</div></div>
                        <div class="row" style="grid-column: 1 / -1;"><div class="label">Address</div><div class="value">\${data.address || ''}</div></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Machine Details</div>
                    <div class="grid">
                        <div class="row"><div class="label">OEM</div><div class="value">\${data.oem || ''}</div></div>
                        <div class="row"><div class="label">Equipment Model</div><div class="value">\${data.equipment_model || ''}</div></div>
                        <div class="row"><div class="label">Chassis Number</div><div class="value">\${data.chassis_number || ''}</div></div>
                        <div class="row"><div class="label">Engine Number</div><div class="value">\${data.engine_number || ''}</div></div>
                        <div class="row"><div class="label">Transmission Type</div><div class="value">\${data.transmission_type || ''}</div></div>
                        <div class="row"><div class="label">Axle Type</div><div class="value">\${data.axle_type || ''}</div></div>
                        <div class="row"><div class="label">Location</div><div class="value">\${data.location || ''}</div></div>
                        <div class="row"><div class="label">Date of Sale</div><div class="value">\${data.date_of_sale || ''}</div></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Warranty & Service</div>
                    <div class="grid">
                        <div class="row"><div class="label">Warranty Applicable</div><div class="value">\${data.warranty_applicable || ''}</div></div>
                        <div class="row"><div class="label">Service Plan</div><div class="value">\${data.service_plan || ''}</div></div>
                        <div class="row"><div class="label">Warranty Start Date</div><div class="value">\${data.warranty_start_date || ''}</div></div>
                        <div class="row"><div class="label">Warranty End Date</div><div class="value">\${data.warranty_end_date || ''}</div></div>
                    </div>
                </div>

                <div class="section" style="page-break-inside: avoid;">
                    <div class="section-title">Handover Checklist</div>
                    <div class="checklist-grid">
                        <div class="check-item"><span class="check-label">Loaded on Pop Register</span><div class="check-box \${data.pop_register === 'Yes' ? 'yes' : ''}">\${data.pop_register === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Machine Data Plate Photo</span><div class="check-box \${data.photos_machine_plate === 'Yes' ? 'yes' : ''}">\${data.photos_machine_plate === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Engine Data Plate Photo</span><div class="check-box \${data.photos_engine_plate === 'Yes' ? 'yes' : ''}">\${data.photos_engine_plate === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">EPR Update</span><div class="check-box \${data.epr_update === 'Yes' ? 'yes' : ''}">\${data.epr_update === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Warranty Cert Given</span><div class="check-box \${data.warranty_cert === 'Yes' ? 'yes' : ''}">\${data.warranty_cert === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Service Checklist</span><div class="check-box \${data.service_checklist === 'Yes' ? 'yes' : ''}">\${data.service_checklist === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Machine Condition Sign-off</span><div class="check-box \${data.machine_status === 'Yes' ? 'yes' : ''}">\${data.machine_status === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Invoice Copy Uploaded</span><div class="check-box \${data.invoice_copy === 'Yes' ? 'yes' : ''}">\${data.invoice_copy === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Client Satisfaction Confirm</span><div class="check-box \${data.client_satisfaction === 'Yes' ? 'yes' : ''}">\${data.client_satisfaction === 'Yes' ? '✓' : ''}</div></div>
                        <div class="check-item"><span class="check-label">Delivery Note Copy</span><div class="check-box \${data.delivery_note === 'Yes' ? 'yes' : ''}">\${data.delivery_note === 'Yes' ? '✓' : ''}</div></div>
                    </div>
                </div>

                <div class="section" style="page-break-inside: avoid;">
                    <div class="section-title">Sign-Offs</div>
                    <div class="sig-grid">
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.sales_rep || '___________________________'}</div>
                                <div class="sig-title">Sales Representative</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.pdi_mgr || '___________________________'}</div>
                                <div class="sig-title">PDI Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.workshop_mgr || '___________________________'}</div>
                                <div class="sig-title">Workshop Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                        <div>
                            <div style="height:60px;"></div>
                            <div class="sig-box">
                                <div class="sig-name">\${data.ops_mgr || '___________________________'}</div>
                                <div class="sig-title">Operations Manager</div>
                                <div class="sig-date">Date: _________________</div>
                            </div>
                        </div>
                    </div>
                </div>

            </body>
            </html>
        \`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    window.sendAftersalesEmail = function() {`;

html = html.replace(jsLocationTarget, purePrintLogic);

fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Fixed broken HTML structure');
