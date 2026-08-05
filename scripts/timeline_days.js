const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `        const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.6)';
        const baseBorder = isToday ? 'transparent' : (hasJobs ? 'rgba(226,232,240,0.8)' : 'rgba(226,232,240,0.4)');
        const baseShadow = isToday ? '0 12px 30px -5px rgba(59,130,246,0.4), 0 0 0 1px rgba(255,255,255,0.2) inset' : (hasJobs ? '0 8px 24px -8px rgba(0,0,0,0.06)' : 'none');
        const hoverShadow = isToday ? '0 20px 40px -5px rgba(59,130,246,0.5), 0 0 0 1px rgba(255,255,255,0.3) inset' : '0 16px 32px -8px rgba(0,0,0,0.1)';
        const hoverTransform = 'translateY(-4px)';
        const opacityStr = (!isToday && !hasJobs) ? 'opacity:0.7;' : '';

        cell.style.cssText = \`background:\${baseBg}; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid \${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:\${baseShadow}; \${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;\`;
        
        cell.onmouseover = () => { cell.style.transform = hoverTransform; cell.style.boxShadow = hoverShadow; if(!isToday) cell.style.borderColor = '#cbd5e1'; };
        cell.onmouseout = () => { cell.style.transform = 'translateY(0)'; cell.style.boxShadow = baseShadow; if(!isToday) cell.style.borderColor = baseBorder; };`;

const replacementStr = `        const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#ffffff';
        const baseBorder = isToday ? 'transparent' : '#93c5fd';
        const baseShadow = isToday ? '0 12px 30px -5px rgba(59,130,246,0.4), 0 0 0 1px rgba(255,255,255,0.2) inset' : '0 12px 24px -4px rgba(59,130,246,0.2)';
        const hoverShadow = isToday ? '0 20px 40px -5px rgba(59,130,246,0.6), 0 0 0 1px rgba(255,255,255,0.4) inset' : '0 20px 40px -5px rgba(59,130,246,0.4)';
        const hoverTransform = 'translateY(-6px)';
        const opacityStr = (!isToday && !hasJobs) ? 'opacity:0.7;' : '';

        cell.style.cssText = \`background:\${baseBg}; border:1px solid \${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:\${baseShadow}; \${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;\`;
        
        cell.onmouseover = () => { cell.style.transform = hoverTransform; cell.style.boxShadow = hoverShadow; if(!isToday) cell.style.borderColor = '#3b82f6'; };
        cell.onmouseout = () => { cell.style.transform = 'translateY(0)'; cell.style.boxShadow = baseShadow; if(!isToday) cell.style.borderColor = baseBorder; };`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced styles successfully');
