const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetStr = `        val('as-delivery-note', 'No');
        
        val('as-sales-rep', '');
        val('as-pdi-mgr', '');
        val('as-workshop-mgr', '');
        val('as-ops-mgr', '');`;

const replaceStr = `        val('as-chk-obs-upload', 'No');
        val('as-chk-epr', 'No');
        val('as-chk-sts', 'No');
        val('as-chk-sg', 'No');
        
        val('as-srd-rm', '');
        val('as-sig-comm', '');
        val('as-sig-sales', '');
        val('as-sig-sts-scc', '');
        val('as-sig-support', '');
        val('as-sig-srd-rm', '');
        val('as-sig-admin', '');`;

html = html.replace(targetStr, replaceStr);
fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Fixed openNewAftersalesForm reset logic');
