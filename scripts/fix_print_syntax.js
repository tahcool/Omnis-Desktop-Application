const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// Replace \` with ` inside printWindow.document.write(
html = html.replace(/printWindow\.document\.write\(\\\`/g, 'printWindow.document.write(`');

// Replace \`); at the end of the printWindow.document.write
html = html.replace(/        \\\`\);\s*printWindow\.document\.close\(\);/g, `        \`);\n        printWindow.document.close();`);

fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Fixed syntax errors in index.html for printWindow');
