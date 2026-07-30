const fs = require('fs');
let html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
html = html.replace('      try {\n        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);\n        if (inputData instanceof Event) inputData = null;\n      try {', '      try {\n        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);\n        if (inputData instanceof Event) inputData = null;');
fs.writeFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', html, 'utf-8');
console.log('Fixed duplicate try block');
