const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

const styles = {
    'Create Service Booking': { color: '#60a5fa' },
    'Log Defect': { color: '#f87171' },
    'Log Tech Hours': { color: '#2dd4bf' },
    'Export Report': { color: '#c084fc' },
    'Bulk HMR Entry': { color: '#94a3b8' },
    'Lookup': { color: '#94a3b8' },
    'Add Machine': { color: '#4ade80' }
};

let count = 0;

$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (styles[text]) {
        let color = styles[text].color;
        let normalStyle = `display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#0f172a;color:${color};border:1px solid #1e293b;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:all .2s ease;white-space:nowrap;`;
        
        $(el).attr('style', normalStyle);
        $(el).attr('onmouseover', `this.style.background='#1e293b';this.style.borderColor='#334155';`);
        $(el).attr('onmouseout', `this.style.background='#0f172a';this.style.borderColor='#1e293b';`);
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully with dark mode style.`);
} else {
    console.log('No buttons found to update.');
}
