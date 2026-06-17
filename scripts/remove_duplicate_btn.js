const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// I need to find the specific button near `product-list-search` and remove it.
// I will use regex to find it robustly.
content = content.replace(/<button[^>]*onclick="window\.openNewAftersalesForm\(\)"[^>]*>[\s\S]*?<i class="fas fa-plus"><\/i>\s*New Handover\s*<\/button>\s*<div style="position:relative;">\s*<i class="fas fa-search"[^>]*><\/i>\s*<input id="product-list-search"/, (match) => {
    // Only return the div and input part
    return match.replace(/<button[\s\S]*?<\/button>\s*/, '');
});

fs.writeFileSync('systems/salestrack/index.html', content);
console.log('Removed duplicate from product-list-search');
