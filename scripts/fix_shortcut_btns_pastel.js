const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

// Define styles for each button to use the "Premium Soft Color" aesthetic
const styles = {
    'Create Service Booking': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#dbeafe", hoverBorder: "#93c5fd", outBg: "#eff6ff", outBorder: "#bfdbfe"
    },
    'Log Defect': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#fee2e2", hoverBorder: "#fca5a5", outBg: "#fef2f2", outBorder: "#fecaca"
    },
    'Log Tech Hours': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#ccfbf1", hoverBorder: "#5eead4", outBg: "#f0fdfa", outBorder: "#99f6e4"
    },
    'Export Report': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#faf5ff;color:#6d28d9;border:1px solid #e9d5ff;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#f3e8ff", hoverBorder: "#d8b4fe", outBg: "#faf5ff", outBorder: "#e9d5ff"
    },
    'Bulk HMR Entry': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#f1f5f9", hoverBorder: "#cbd5e1", outBg: "#f8fafc", outBorder: "#e2e8f0"
    },
    'Lookup': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#f1f5f9", hoverBorder: "#cbd5e1", outBg: "#f8fafc", outBorder: "#e2e8f0"
    },
    'Add Machine': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all .2s ease;white-space:nowrap;",
        hoverBg: "#dcfce7", hoverBorder: "#86efac", outBg: "#f0fdf4", outBorder: "#bbf7d0"
    }
};

let count = 0;

$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (styles[text]) {
        let styleObj = styles[text];
        $(el).attr('style', styleObj.normal);
        $(el).attr('onmouseover', `this.style.background='${styleObj.hoverBg}';this.style.borderColor='${styleObj.hoverBorder}';`);
        $(el).attr('onmouseout', `this.style.background='${styleObj.outBg}';this.style.borderColor='${styleObj.outBorder}';`);
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully with premium translucent colors.`);
} else {
    console.log('No buttons found to update.');
}
