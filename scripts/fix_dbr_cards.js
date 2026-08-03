const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const wrenchSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
const clockSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const alertSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

html = html.replace(
    '<div style="background:#e0f2fe; color:#0284c7; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">🔧</div>',
    `<div style="background:#f1f5f9; color:#475569; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${wrenchSvg}</div>`
);

html = html.replace(
    '<div style="background:#fef3c7; color:#d97706; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">⏳</div>',
    `<div style="background:#f1f5f9; color:#475569; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${clockSvg}</div>`
);

html = html.replace(
    '<div style="background:#fee2e2; color:#dc2626; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">🚨</div>',
    `<div style="background:#f1f5f9; color:#475569; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${alertSvg}</div>`
);

// Optional: enhance the subtle drop shadow of the cards and ensure professional gradient background as requested by "apply same concepts"
// The DBR cards currently have: background:#f8fafc; border:1px solid #e2e8f0; ... box-shadow:0 2px 4px rgba(0,0,0,0.02);
// Let's make them linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)
html = html.replace(
    /background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 4px rgba\(0,0,0,0\.02\);/g,
    'background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);'
);


fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Updated DBR KPI cards');
