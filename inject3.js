const fs = require('fs');
const path = 'c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let text = fs.readFileSync(path, 'utf-8');

const t1 = '    window.showStockPipelineForm = function (inputData = null) {';
text = text.replace(t1, t1 + `
      try {
        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);
        if (inputData instanceof Event) {
           console.log("[Stock] Event passed, ignoring...");
           inputData = null;
        }
`);

const t2 = '        overlay.style.display = "flex";\n      }\n    };';
text = text.replace(t2, '        overlay.style.display = "flex";\n      }\n      } catch (err) {\n        console.error("ERROR in showStockPipelineForm:", err);\n        alert("Error opening form: " + err.message);\n      }\n    };');

// Let's also prefix window. to setupSupabaseSuggestions inside this function
text = text.replace(/setupSupabaseSuggestions\(/g, 'window.setupSupabaseSuggestions(');
text = text.replace(/setupSuggestions\(/g, 'window.setupSuggestions(');

fs.writeFileSync(path, text, 'utf-8');
console.log("Injected try-catch successfully.");
