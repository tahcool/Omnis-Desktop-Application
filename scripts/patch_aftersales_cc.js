const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetStr = `        // Use as-email2 instead of additional_email (based on form field id)
        const email2 = document.getElementById('as-email2')?.value;
        if (email2) {
            mailtoLink = \\\`mailto:\\\${data.email_address}?cc=\\\${email2}&subject=\\\${subject}&body=\\\${body}\\\`;
        }`;

const replaceStr = `        // Use as-email2 instead of additional_email (based on form field id)
        const email2 = document.getElementById('as-email2')?.value;
        
        // Internal CC logic from Settings
        const companyKey = (data.company || '').toLowerCase().includes('sino') ? 'spz' : 'mxg';
        let internalCcRaw = '';
        try {
            const savedSettings = JSON.parse(localStorage.getItem('salestrackSettings') || '{}');
            internalCcRaw = savedSettings[\`emailRecipients_\${companyKey}\`] || '';
        } catch(e) {}
        
        const internalCcList = internalCcRaw.split('\\n').map(e => e.trim()).filter(Boolean);
        if (email2) {
            internalCcList.unshift(email2);
        }
        
        const allCc = internalCcList.join(',');
        
        if (allCc) {
            mailtoLink = \`mailto:\${data.email_address}?cc=\${allCc}&subject=\${subject}&body=\${body}\`;
        }`;

html = html.replace(targetStr.replace(/\\\\`/g, '`').replace(/\\\\\$/g, '$'), replaceStr);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Added internal CC logic to aftersales email');
