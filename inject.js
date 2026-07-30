const fs = require('fs');
const path = 'c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let text = fs.readFileSync(path, 'utf-8');

const t1 = '    window.showStockPipelineForm = function (inputData = null) {';
text = text.replace(t1, t1 + '\n      try {');

const t2 = '        overlay.style.display = "flex";\n      }\n    };';
const r2 = '        overlay.style.display = "flex";\n      }\n      } catch(err) { alert("Error: " + err.message + "\\n" + err.stack); }\n    };';
text = text.replace(t2, r2);

fs.writeFileSync(path, text);
console.log('Done');
