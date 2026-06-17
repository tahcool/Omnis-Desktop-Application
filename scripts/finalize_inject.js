const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// 1. Inject sendAftersalesEmail before completeAftersalesForm
const jsReplaceComplete = `    // ── Send Email Update ──
    window.sendAftersalesEmail = function() {
        const data = gatherFormData();
        if (!data.email_address) {
            alert('Please enter an Email Address for the customer first.');
            return;
        }

        const subject = encodeURIComponent(\`Aftersales Handover Summary - \${data.equipment_model || 'Equipment'}\`);
        let bodyText = \`Dear \${data.contact_person || 'Customer'},\n\n\`;
        bodyText += \`This is an automated update regarding your recent equipment handover.\n\n\`;
        bodyText += \`EQUIPMENT DETAILS:\n\`;
        bodyText += \`- OEM: \${data.oem || 'N/A'}\n\`;
        bodyText += \`- Model: \${data.equipment_model || 'N/A'}\n\`;
        bodyText += \`- Chassis No: \${data.chassis_number || 'N/A'}\n\`;
        bodyText += \`- Engine No: \${data.engine_number || 'N/A'}\n\n\`;
        
        bodyText += \`WARRANTY & SERVICE:\n\`;
        bodyText += \`- Warranty Period: \${data.warranty_applicable || 'N/A'}\n\`;
        bodyText += \`- Warranty Start: \${data.warranty_start_date || 'N/A'}\n\`;
        bodyText += \`- Warranty End: \${data.warranty_end_date || 'N/A'}\n\`;
        bodyText += \`- Service Plan: \${data.service_plan || 'N/A'}\n\n\`;

        bodyText += \`TRAINING:\n\`;
        bodyText += \`- Completed: \${data.training_done || 'No'}\n\`;
        if (data.training_done === 'Yes') {
            bodyText += \`- Date: \${data.training_date || 'N/A'}\n\`;
            bodyText += \`- Operator Trained: \${data.training_operator || 'N/A'}\n\n\`;
        } else {
            bodyText += \`\n\`;
        }

        if (data.notes) {
            bodyText += \`NOTES:\n\${data.notes}\n\n\`;
        }

        bodyText += \`Thank you for your business!\n\nBest Regards,\nAftersales Team\`;

        const body = encodeURIComponent(bodyText);
        let mailtoLink = \`mailto:\${data.email_address}?subject=\${subject}&body=\${body}\`;
        if (data.additional_email) {
            mailtoLink = \`mailto:\${data.email_address}?cc=\${data.additional_email}&subject=\${subject}&body=\${body}\`;
        }
        
        window.location.href = mailtoLink;
    };

    window.completeAftersalesForm = async function() {`;

content = content.replace(/\s*window\.completeAftersalesForm = async function\(\) \{/, "\n" + jsReplaceComplete);

// 2. Add Email button to Modal
content = content.replace(/<button id="as-save-btn" onclick="window\.saveAftersalesForm\(\)"/, `<button id="as-email-btn" onclick="window.sendAftersalesEmail()" style="flex:1; height:48px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(59,130,246,0.3); transition:all 0.2s; margin-right:10px;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'"><i class="fas fa-paper-plane"></i> Email Update</button>\n          <button id="as-save-btn" onclick="window.saveAftersalesForm()"`);

// 3. Fix save logic
const saveLogicTarget = `            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };`;
const saveLogicReplace = `            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };
            else _aftersalesRecords.unshift(data);`;

content = content.split(saveLogicTarget).join(saveLogicReplace);

fs.writeFileSync('systems/salestrack/index.html', content);
console.log('Final injected script done');
