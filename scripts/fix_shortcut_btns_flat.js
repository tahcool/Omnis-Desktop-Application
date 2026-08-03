const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

const styles = {
    'Create Service Booking': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#2563eb;color:#ffffff;border:1px solid #1d4ed8;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(37,99,235,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#1d4ed8",
        normalBg: "#2563eb"
    },
    'Log Defect': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#dc2626;color:#ffffff;border:1px solid #b91c1c;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(220,38,38,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#b91c1c",
        normalBg: "#dc2626"
    },
    'Log Tech Hours': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#0d9488;color:#ffffff;border:1px solid #0f766e;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(13,148,136,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#0f766e",
        normalBg: "#0d9488"
    },
    'Export Report': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#7c3aed;color:#ffffff;border:1px solid #6d28d9;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(124,58,237,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#6d28d9",
        normalBg: "#7c3aed"
    },
    'Bulk HMR Entry': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#475569;color:#ffffff;border:1px solid #334155;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(71,85,105,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#334155",
        normalBg: "#475569"
    },
    'Lookup': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#475569;color:#ffffff;border:1px solid #334155;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(71,85,105,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#334155",
        normalBg: "#475569"
    },
    'Add Machine': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#16a34a;color:#ffffff;border:1px solid #15803d;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(22,163,74,0.15);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#15803d",
        normalBg: "#16a34a"
    }
};

let count = 0;

$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (styles[text]) {
        let styleObj = styles[text];
        $(el).attr('style', styleObj.normal);
        
        $(el).attr('onmouseover', `this.style.background='${styleObj.hoverBg}';`);
        $(el).attr('onmouseout', `this.style.background='${styleObj.normalBg}';`);
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully with flat solid colors.`);
} else {
    console.log('No buttons found to update.');
}
