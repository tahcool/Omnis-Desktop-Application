const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// I will just use string replacement for each button to be extremely precise
const replacements = [
    {
        // Create Service Booking (Primary)
        find: /background:#2563eb;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#1d4ed8';" onmouseout="this\.style\.background='#2563eb';"/,
        replace: 'background:#0f172a;color:#ffffff;border:1px solid #0f172a;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#334155\';this.style.borderColor=\'#334155\';" onmouseout="this.style.background=\'#0f172a\';this.style.borderColor=\'#0f172a\';"'
    },
    {
        // Add Machine (Primary)
        find: /background:#16a34a;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#15803d';" onmouseout="this\.style\.background='#16a34a';"/,
        replace: 'background:#0f172a;color:#ffffff;border:1px solid #0f172a;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#334155\';this.style.borderColor=\'#334155\';" onmouseout="this.style.background=\'#0f172a\';this.style.borderColor=\'#0f172a\';"'
    },
    {
        // Log Defect (Secondary)
        find: /background:#dc2626;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#b91c1c';" onmouseout="this\.style\.background='#dc2626';"/,
        replace: 'background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#cbd5e1\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e2e8f0\';"'
    },
    {
        // Log Tech Hours (Secondary)
        find: /background:#0d9488;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#0f766e';" onmouseout="this\.style\.background='#0d9488';"/,
        replace: 'background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#cbd5e1\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e2e8f0\';"'
    },
    {
        // Export Report (Secondary)
        find: /background:#7c3aed;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#6d28d9';" onmouseout="this\.style\.background='#7c3aed';"/,
        replace: 'background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#cbd5e1\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e2e8f0\';"'
    },
    {
        // Bulk HMR Entry & Lookup (Secondary)
        // Note: These share the same colors in the original (#475569) so we can replace globally for both
        find: /background:#475569;color:#ffffff;border:1px solid transparent;([^;]+;){0,2}box-shadow:none;transition:all \.2s ease;white-space:nowrap;" onmouseover="this\.style\.background='#334155';" onmouseout="this\.style\.background='#475569';"/g,
        replace: 'background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#cbd5e1\';" onmouseout="this.style.background=\'#ffffff\';this.style.borderColor=\'#e2e8f0\';"'
    }
];

let changed = false;
for (const r of replacements) {
    if (html.match(r.find)) {
        html = html.replace(r.find, r.replace);
        changed = true;
    }
}

if (changed) {
    fs.writeFileSync('systems/fleetrack/index.html', html);
    console.log('Successfully updated shortcut buttons to professional greyscale style');
} else {
    console.log('Error: Could not find matches for replacement');
}
