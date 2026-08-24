const fs = require('fs');
const html = fs.readFileSync('systems/salestrack/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('scrollableViews =') || l.includes('scrollableViewIds =') || l.includes('} else if (viewId === "view-orders-list") {') || (l.includes('<script src="https://cdn.jsdelivr.net/npm/driver.js') && i > 27700)) {
        console.log((i+1) + ': ' + l.trim());
    }
});
