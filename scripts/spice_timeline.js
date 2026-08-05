const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Update the cell styling to use glassmorphism for non-today cells
content = content.replace(
  "const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#ffffff';",
  "const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.6)';"
);

content = content.replace(
  "cell.style.cssText = `background:${baseBg}; border:1px solid ${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:${baseShadow}; ${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;`;",
  "cell.style.cssText = `background:${baseBg}; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid ${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:${baseShadow}; ${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;`;"
);

// 2. Update the inner pill styling
content = content.replace(
  /jdiv\.style\.cssText = `background:#ffffff; border:1px solid rgba\(226,232,240,0\.8\); border-left:4px solid \$\{txC\}; border-radius:10px; padding:8px 10px; font-size:10px; cursor:pointer; transition:all \.2s; box-shadow:0 2px 6px -2px rgba\(0,0,0,0\.05\);`;/,
  "jdiv.style.cssText = `background:rgba(255,255,255,0.95); border:1px solid rgba(226,232,240,0.8); border-left:4px solid ${txC}; border-radius:12px; padding:8px 10px; font-size:10px; cursor:pointer; transition:all .3s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow:0 4px 12px -2px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02);`;"
);

content = content.replace(
  /jdiv\.onmouseover = \(\) => { jdiv\.style\.boxShadow = '0 6px 14px -4px rgba\(0,0,0,0\.08\)'; jdiv\.style\.transform = 'translateY\(-1px\)'; jdiv\.style\.borderColor = '#cbd5e1'; };/,
  "jdiv.onmouseover = () => { jdiv.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)'; jdiv.style.transform = 'translateY(-2px)'; jdiv.style.borderColor = '#cbd5e1'; };"
);

content = content.replace(
  /jdiv\.onmouseout = \(\) => { jdiv\.style\.boxShadow = '0 2px 6px -2px rgba\(0,0,0,0\.05\)'; jdiv\.style\.transform = 'translateY\(0\)'; jdiv\.style\.borderColor = 'rgba\(226,232,240,0\.8\)'; };/,
  "jdiv.onmouseout = () => { jdiv.style.boxShadow = '0 4px 12px -2px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)'; jdiv.style.transform = 'translateY(0)'; jdiv.style.borderColor = 'rgba(226,232,240,0.8)'; };"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Spiced up timeline!');
