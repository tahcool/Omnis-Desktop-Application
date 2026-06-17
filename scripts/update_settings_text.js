const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

html = html.replace(
    '<i class="fas fa-envelope" style="color:#1d4ed8;"></i> Order Tracking Email Recipients',
    '<i class="fas fa-envelope" style="color:#1d4ed8;"></i> Automated Email CC Recipients'
);

html = html.replace(
    '<p style="color:#64748b; font-size:13px; margin-top:6px;">Configure the internal staff CC\\'d on every Order Tracking email. Enter one email per line.</p>',
    '<p style="color:#64748b; font-size:13px; margin-top:6px;">Configure the internal staff CC\\'d on Order Tracking and Aftersales Handover emails. Enter one email per line.</p>'
);

fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Updated settings UI text');
