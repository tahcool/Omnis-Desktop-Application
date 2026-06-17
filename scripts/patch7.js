const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

content = content.replace(
    "let container = document.querySelector('.modal-content') || document.querySelector('.salestrack-modal-body');",
    "let container = document.getElementById('dash-generic-body') || document.querySelector('.modal-content') || document.querySelector('.salestrack-modal-body');"
);

fs.writeFileSync(jsPath, content);
console.log('Fixed printReportContent container selector');
