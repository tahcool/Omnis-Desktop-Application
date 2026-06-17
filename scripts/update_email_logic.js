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

const newEmailLogic = `    window.sendAftersalesEmail = function() {
        const data = gatherFormData();
        if (!data.email_address) {
            alert('Please enter an Email Address for the customer first.');
            return;
        }

        const subject = encodeURIComponent(\`Aftersales Handover - \${data.equipment_model || 'Equipment'}\`);
        
        const pad = (str, len) => (str || '').padEnd(len, ' ');
        const tPad = 25;
        
        let bodyText = \`Good Day \${data.contact_person || 'Gentleman'}

We would like to thank you for your valued purchase.

I would like to introduce you to Fleetrack that will be monitoring your machine throughout your warranty and thereafter.

@MXG | Fleetrack (Bruce) and his Fleetrack team will be your point of contact for any aftersales queries and service requirements.

Your machine has been added to our Fleetrack Machine Management System.

Fleetrack will be in contact with you with all the details as well as contact information for our Customer Support Division (CSD).

A Customer Support Group (CSG) will be created; this will be used to report anything on your machine as well as request services. You will be made an admin for the ease of adding your employees to the group.

Machine Model: \${data.equipment_model || 'N/A'}
SN: \${data.chassis_number || 'N/A'}

====================================================
               ADDITIONAL DETAILS                   
====================================================
\${pad('OEM', tPad)}: \${data.oem || 'N/A'}
\${pad('Engine Number', tPad)}: \${data.engine_number || 'N/A'}
\${pad('Warranty Applicable', tPad)}: \${data.warranty_applicable || 'N/A'}
\${pad('Warranty Start', tPad)}: \${data.warranty_start_date || 'N/A'}
\${pad('Warranty End', tPad)}: \${data.warranty_end_date || 'N/A'}
\${pad('Service Plan', tPad)}: \${data.service_plan || 'N/A'}
====================================================

Please feel free to contact us with any questions or queries.

Kind regards
\${data.sales_rep || 'Aftersales Team'}
\`;

        const body = encodeURIComponent(bodyText);
        let mailtoLink = \`mailto:\${data.email_address}?subject=\${subject}&body=\${body}\`;
        
        // Use as-email2 instead of additional_email (based on form field id)
        const email2 = document.getElementById('as-email2')?.value;
        if (email2) {
            mailtoLink = \`mailto:\${data.email_address}?cc=\${email2}&subject=\${subject}&body=\${body}\`;
        }
        
        window.location.href = mailtoLink;
    };

`;

html = html.substring(0, idxStart) + newEmailLogic + html.substring(idxEnd);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Email logic updated');
