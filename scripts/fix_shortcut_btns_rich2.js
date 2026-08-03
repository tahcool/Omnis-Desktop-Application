const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

const styles = {
    'Create Service Booking': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #3b82f6, #1d4ed8);color:#ffffff;border:1px solid #1e40af;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(29, 78, 216, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #60a5fa, #2563eb)",
        hoverShadow: "0 6px 14px rgba(29, 78, 216, 0.4)",
        normalBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        normalShadow: "0 4px 10px rgba(29, 78, 216, 0.25)"
    },
    'Log Defect': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #ef4444, #b91c1c);color:#ffffff;border:1px solid #991b1b;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(185, 28, 28, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #f87171, #dc2626)",
        hoverShadow: "0 6px 14px rgba(185, 28, 28, 0.4)",
        normalBg: "linear-gradient(135deg, #ef4444, #b91c1c)",
        normalShadow: "0 4px 10px rgba(185, 28, 28, 0.25)"
    },
    'Log Tech Hours': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #14b8a6, #0f766e);color:#ffffff;border:1px solid #115e59;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(15, 118, 110, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #2dd4bf, #0d9488)",
        hoverShadow: "0 6px 14px rgba(15, 118, 110, 0.4)",
        normalBg: "linear-gradient(135deg, #14b8a6, #0f766e)",
        normalShadow: "0 4px 10px rgba(15, 118, 110, 0.25)"
    },
    'Export Report': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #8b5cf6, #6d28d9);color:#ffffff;border:1px solid #5b21b6;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(109, 40, 217, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #a78bfa, #7c3aed)",
        hoverShadow: "0 6px 14px rgba(109, 40, 217, 0.4)",
        normalBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        normalShadow: "0 4px 10px rgba(109, 40, 217, 0.25)"
    },
    'Bulk HMR Entry': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #64748b, #334155);color:#ffffff;border:1px solid #1e293b;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(51, 65, 85, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #94a3b8, #475569)",
        hoverShadow: "0 6px 14px rgba(51, 65, 85, 0.4)",
        normalBg: "linear-gradient(135deg, #64748b, #334155)",
        normalShadow: "0 4px 10px rgba(51, 65, 85, 0.25)"
    },
    'Lookup': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #64748b, #334155);color:#ffffff;border:1px solid #1e293b;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(51, 65, 85, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #94a3b8, #475569)",
        hoverShadow: "0 6px 14px rgba(51, 65, 85, 0.4)",
        normalBg: "linear-gradient(135deg, #64748b, #334155)",
        normalShadow: "0 4px 10px rgba(51, 65, 85, 0.25)"
    },
    'Add Machine': {
        normal: "display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg, #22c55e, #15803d);color:#ffffff;border:1px solid #166534;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(21, 128, 61, 0.25);transition:all .2s ease;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.1);",
        hoverBg: "linear-gradient(135deg, #4ade80, #16a34a)",
        hoverShadow: "0 6px 14px rgba(21, 128, 61, 0.4)",
        normalBg: "linear-gradient(135deg, #22c55e, #15803d)",
        normalShadow: "0 4px 10px rgba(21, 128, 61, 0.25)"
    }
};

let count = 0;

$('button').each((i, el) => {
    let text = $(el).text().trim();
    if (styles[text]) {
        let styleObj = styles[text];
        $(el).attr('style', styleObj.normal);
        
        $(el).attr('onmouseover', `this.style.background='${styleObj.hoverBg}';this.style.transform='translateY(-1px)';this.style.boxShadow='${styleObj.hoverShadow}';`);
        $(el).attr('onmouseout', `this.style.background='${styleObj.normalBg}';this.style.transform='translateY(0)';this.style.boxShadow='${styleObj.normalShadow}';`);
        count++;
    }
});

if (count > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', $.html());
    console.log(`Updated ${count} buttons successfully with rich gradients.`);
} else {
    console.log('No buttons found to update.');
}
