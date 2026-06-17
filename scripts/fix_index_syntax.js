const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const targetBroken = `if (!confirm(\\\`Are you sure you want to assign \\\${window.omnisSelectedOrders.size} order(s) to \\\${selectedCompany}?\\\`)) {`;
const replaceFixed = `if (!confirm(\`Are you sure you want to assign \${window.omnisSelectedOrders.size} order(s) to \${selectedCompany}?\`)) {`;

html = html.replace(targetBroken, replaceFixed);

// Let's also check if there are other \` in the file that shouldn't be there.
// Search for `window.omnisLog(\`Assigned \${window.omnisSelectedOrders.size} orders to \${selectedCompany}\`, 'success');`
const targetLog = `if (window.omnisLog) window.omnisLog(\\\`Assigned \\\${window.omnisSelectedOrders.size} orders to \\\${selectedCompany}\\\`, 'success');`;
const replaceLog = `if (window.omnisLog) window.omnisLog(\`Assigned \${window.omnisSelectedOrders.size} orders to \${selectedCompany}\`, 'success');`;

html = html.replace(targetLog, replaceLog);

fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Fixed syntax errors in index.html');
