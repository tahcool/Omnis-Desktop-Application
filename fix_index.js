const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

const regex1 = /document\.querySelector\('\.top-nav-dropdown-item\[data-view="view-cdv"\]'\)\.addEventListener\('click', \(\) => \{\n        window\.loadCdvAssigned\(\);\n    \}\);/g;
const repl1 = `const cdvL = document.querySelector('.top-nav-dropdown-item[data-view="view-cdv"]');\n    if (cdvL) { cdvL.addEventListener('click', () => { window.loadCdvAssigned(); }); }`;

const regex2 = /document\.querySelector\('\.sidebar-item\[data-view="view-dashboard"\]'\)\.addEventListener\('click', \(\) => \{\n        window\.updateWeeklyTargets\(\);\n    \}\);/g;
const repl2 = `const dashL = document.querySelector('.sidebar-item[data-view="view-dashboard"]');\n    if (dashL) { dashL.addEventListener('click', () => { window.updateWeeklyTargets(); }); }`;

content = content.replace(regex1, repl1);
content = content.replace(regex2, repl2);

fs.writeFileSync(file, content);
console.log('Fixed index.html listeners');
