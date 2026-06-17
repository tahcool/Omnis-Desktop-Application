const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetStr = `        // Internal CC logic from Settings
        const companyKey = (data.company || '').toLowerCase().includes('sino') ? 'spz' : 'mxg';
        let internalCcRaw = '';
        try {
            const savedSettings = JSON.parse(localStorage.getItem('salestrackSettings') || '{}');
            internalCcRaw = savedSettings[\\\`emailRecipients_\\\${companyKey}\\\`] || '';
        } catch(e) {}
        
        const internalCcList = internalCcRaw.split('\\n').map(e => e.trim()).filter(Boolean);`;

const replaceStr = `        // Internal CC logic from Settings
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
`;

html = html.replace(targetStr.replace(/\\\\`/g, '`').replace(/\\\\\$/g, '$'), replaceStr);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Fixed internal CC logic');
