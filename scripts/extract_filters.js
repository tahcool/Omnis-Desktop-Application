const fs = require('fs');
const html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const views = ['view-reports', 'view-defects', 'view-rpt-mwr', 'view-rpt-aftersales'];

views.forEach(v => {
    console.log(`\n\n========== ${v} ==========`);
    const start = html.indexOf(`id="${v}"`);
    if(start === -1) {
        console.log("NOT FOUND");
        return;
    }
    const filterStart = html.indexOf('class="filter-bar"', start);
    if(filterStart === -1 || filterStart > start + 5000) {
        console.log("NO FILTER BAR FOUND");
        return;
    }
    const filterEnd = html.indexOf('</div>', filterStart + 2000) !== -1 ? filterStart + 1500 : filterStart + 1000; 
    console.log(html.substring(filterStart, filterEnd));
});
