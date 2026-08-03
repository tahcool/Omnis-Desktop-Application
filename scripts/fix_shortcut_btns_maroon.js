const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

const targetButtons = [
    'Create Service Booking',
    'Log Defect',
    'Log Tech Hours',
    'Export Report',
    'Bulk HMR Entry',
    'Lookup',
    'Add Machine'
];

let count = 0;

$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (targetButtons.includes(text)) {
        let normalStyle = `display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #4a0404, #0f0f10);color:#ffffff;border:1px solid #6a0606;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:all .2s ease;white-space:nowrap;`;
        
        $(el).attr('style', normalStyle);
        $(el).attr('onmouseover', `this.style.background='linear-gradient(135deg, #6a0606, #0f0f10)';this.style.borderColor='#8a0808';`);
        $(el).attr('onmouseout', `this.style.background='linear-gradient(135deg, #4a0404, #0f0f10)';this.style.borderColor='#6a0606';`);
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully with maroon/black style.`);
} else {
    console.log('No buttons found to update.');
}
