const fs = require('fs');
const html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const views = ['view-reports', 'view-defects', 'view-rpt-mwr', 'view-rpt-aftersales'];
views.forEach(v => {
    const idx = html.indexOf(`id="${v}"`);
    if(idx > -1) {
        console.log(`\n--- ${v} ---`);
        console.log(html.substring(idx - 50, idx + 800));
    } else {
        console.log(`\n--- ${v} not found ---`);
    }
});
