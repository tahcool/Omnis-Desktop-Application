const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

const getPrimaryStyle = (isHover) => {
    return isHover ? "background:'#334155'" : "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#0f172a;color:#ffffff;border:1px solid #0f172a;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all .2s ease;white-space:nowrap;";
};

const getSecondaryStyle = (isHover) => {
    return isHover ? "background:'#f8fafc'; borderColor:'#cbd5e1'" : "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;";
};

let count = 0;
// We know these buttons are right after <!-- ══ QUICK-ACTION STRIP ══ -->
// Let's find them by their text
const textsToPrimary = ['Create Service Booking', 'Add Machine'];
const textsToSecondary = ['Log Defect', 'Log Tech Hours', 'Export Report', 'Bulk HMR Entry', 'Lookup'];

// We iterate through all buttons
$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (textsToPrimary.includes(text)) {
        $(el).attr('style', getPrimaryStyle(false));
        $(el).attr('onmouseover', "this.style.background='#334155';this.style.borderColor='#334155';");
        $(el).attr('onmouseout', "this.style.background='#0f172a';this.style.borderColor='#0f172a';");
        count++;
    } else if (textsToSecondary.includes(text)) {
        $(el).attr('style', getSecondaryStyle(false));
        $(el).attr('onmouseover', "this.style.background='#f8fafc';this.style.borderColor='#cbd5e1';");
        $(el).attr('onmouseout', "this.style.background='#ffffff';this.style.borderColor='#e2e8f0';");
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully.`);
} else {
    console.log('No buttons found to update.');
}
