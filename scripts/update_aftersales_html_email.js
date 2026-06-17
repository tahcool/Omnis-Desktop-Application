const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetStart = '    window.sendAftersalesEmail = function() {';
const targetEnd = '    window.completeAftersalesForm = async function() {';

const idxStart = html.indexOf(targetStart);
const idxEnd = html.indexOf(targetEnd);

if (idxStart === -1 || idxEnd === -1) {
    console.error("Could not find targets");
    process.exit(1);
}

const newEmailLogic = `    window.sendAftersalesEmail = async function() {
        const data = gatherFormData();
        if (!data.email_address) {
            alert('Please enter an Email Address for the customer first.');
            return;
        }

        const btn = document.getElementById('as-email-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = \`<span>&#9203;</span> Sending...\`; }

        try {
            const subject = \`Aftersales Handover - \${data.equipment_model || 'Equipment'}\`;
            
            // Internal CC logic from Settings
            const companyKey = (data.company || '').toLowerCase().includes('sino') ? 'spz' : 'mxg';
            let internalCcList = [];
            try {
                const savedSettings = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                const compData = savedSettings[companyKey] || {};
                // handle legacy array format or new object format
                if (Array.isArray(compData)) {
                    internalCcList = compData;
                } else if (compData.cc && Array.isArray(compData.cc)) {
                    internalCcList = compData.cc;
                }
            } catch(e) {}

            const email2 = document.getElementById('as-email2')?.value;
            if (email2) {
                internalCcList.unshift(email2);
            }
            const ccListStr = internalCcList.join(',');

            // Build HTML Body
            const customerName = data.contact_person || 'Gentleman';
            const brand = companyKey === 'spz' ? 'Sinopower' : 'Machinery Exchange';
            const colour = companyKey === 'spz' ? '#7b1515' : '#c92222';
            const logo = companyKey === 'spz' 
                ? 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png' 
                : 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';

            const emailHtml = \`
            <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="\${logo}" alt="\${brand}" style="max-height: 60px;">
                </div>
                
                <p>Good Day \${customerName},</p>
                
                <p>We would like to thank you for your valued purchase.</p>
                
                <p>I would like to introduce you to Fleetrack that will be monitoring your machine throughout your warranty and thereafter.</p>
                
                <p><strong>@MXG | Fleetrack (Bruce)</strong> and his Fleetrack team will be your point of contact for any aftersales queries and service requirements.</p>
                
                <p>Your machine has been added to our Fleetrack Machine Management System.</p>
                
                <p>Fleetrack will be in contact with you with all the details as well as contact information for our Customer Support Division (CSD).</p>
                
                <p>A Customer Support Group (CSG) will be created; this will be used to report anything on your machine as well as request services. You will be made an admin for the ease of adding your employees to the group.</p>

                <div style="margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: \${colour}; color: white;">
                                <th colspan="2" style="padding: 12px 20px; text-align: left; font-size: 16px;">Machine Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 40%; background: #f8fafc;">Machine Model</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.equipment_model || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">SN (Chassis Number)</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.chassis_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">OEM</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.oem || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Engine Number</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.engine_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Warranty Applicable</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.warranty_applicable || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Warranty Start</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.warranty_start_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Warranty End</td>
                                <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">\${data.warranty_end_date || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 20px; font-weight: bold; background: #f8fafc;">Service Plan</td>
                                <td style="padding: 12px 20px;">\${data.service_plan || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p>Please feel free to contact us with any questions or queries.</p>
                
                <p>Kind regards,<br><strong>\${data.sales_rep || 'Aftersales Team'}</strong></p>
            </div>
            \`;

            if (!window.electron || !window.electron.invoke) throw new Error('System email service unavailable');
            
            const res = await window.electron.invoke('email:send', {
                to: data.email_address, 
                cc: ccListStr, 
                subject: subject, 
                html: emailHtml,
                relatedDoc: data.order_id, 
                relatedType: 'aftersales'
            });
            
            if (res && res.ok) {
                if (btn) btn.innerHTML = \`<span>&#9989;</span> Sent!\`;
                if (window.omnisLog) window.omnisLog('Aftersales email queued to ' + data.email_address, 'success');
            } else {
                throw new Error(res?.error || 'Failed to queue email.');
            }
        } catch(err) {
            console.error('Email error:', err);
            alert('Failed to send email: ' + err.message);
            if (btn) btn.innerHTML = \`<span>&#10060;</span> Error\`;
        }

        setTimeout(() => { 
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || \`<i class="fas fa-paper-plane"></i> Email Update\`; } 
        }, 3000);
    };

`;

html = html.substring(0, idxStart) + newEmailLogic + html.substring(idxEnd);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Email HTML dispatch logic updated');
