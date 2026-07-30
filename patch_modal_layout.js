const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Increase total modal width
html = html.replace('width:1100px; max-width:95vw; height:800px;', 'width:1300px; max-width:98vw; height:800px;');

// 2. Adjust left column width
html = html.replace('width:280px; background:#f8fafc; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; padding:24px 16px; overflow-y:auto;', 'width:260px; background:#f8fafc; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; padding:24px 16px; overflow-y:auto;');

// 3. Adjust middle column width
html = html.replace('width:360px; background:#ffffff; border-right:1px solid #e2e8f0; padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;" id="rpt-selection-grid"', 'width:320px; background:#ffffff; border-right:1px solid #e2e8f0; padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;" id="rpt-selection-grid"');

// 4. Adjust preview document skeleton title and overall presentation
html = html.replace('<h1 id="rpt-preview-title" style="margin:0 0 8px 0; font-size:24px; font-weight:900; color:#0f172a;">Report Name</h1>', '<h1 id="rpt-preview-title" style="margin:0 0 8px 0; font-size:20px; font-weight:900; color:#0f172a; line-height:1.2; max-width:300px; text-align:right;">Report Name</h1>');

html = html.replace('<div id="rpt-preview-document" class="hidden" style="width:100%; max-width:600px; background:#fff; min-height:800px; box-shadow:0 20px 40px -10px rgba(0,0,0,0.1); border-radius:8px; padding:40px; display:flex; flex-direction:column;">', '<div id="rpt-preview-document" class="hidden" style="width:100%; max-width:700px; background:#fff; min-height:850px; box-shadow:0 20px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05); border-radius:8px; padding:48px; display:flex; flex-direction:column; transform:scale(0.85); transform-origin:top center; margin-bottom:-100px;">');

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Modal preview layout fixed.");
