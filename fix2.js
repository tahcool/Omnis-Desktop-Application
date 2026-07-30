const fs = require('fs');
const path = 'c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
let html = fs.readFileSync(path, 'utf-8');
let lines = html.split('\n');

// 1. Replace button onclicks
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onclick="showStockPipelineForm()"')) {
    lines[i] = lines[i].replace('onclick="showStockPipelineForm()"', 'onclick="window.showStockPipelineForm()"');
  }
  if (lines[i].includes('onclick="showStockPipelineForm(\\\'${safeName}\\\')"')) {
    lines[i] = lines[i].replace('onclick="showStockPipelineForm(\\\'${safeName}\\\')"', 'onclick="window.showStockPipelineForm(\\\'${safeName}\\\')"');
  }
}

// 2. Inject try-catch in showStockPipelineForm
let funcStart = -1;
let funcEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('window.showStockPipelineForm = function (inputData = null) {')) {
    funcStart = i;
  }
  if (funcStart !== -1 && i > funcStart && lines[i].includes('    window.closeStockPipelineForm = function () {')) {
    // The previous line is the end of the previous function (usually spaces and `};`)
    funcEnd = i - 1;
    break;
  }
}

if (funcStart !== -1 && funcEnd !== -1) {
  // Insert `try {` after funcStart
  lines.splice(funcStart + 1, 0, '      try {', '        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);', '        if (inputData instanceof Event) inputData = null;');
  
  // Update funcEnd because we added 3 lines
  funcEnd += 3;

  // Insert `catch` before `};` at funcEnd
  // Let's find the `};` line
  while(funcEnd > funcStart && !lines[funcEnd].includes('};')) {
    funcEnd--;
  }
  if (lines[funcEnd].includes('};')) {
    lines.splice(funcEnd, 0, '      } catch(err) { console.error("ERROR in showStockPipelineForm:", err); alert("Error opening form: " + err.message); }');
    funcEnd++; // Move past the newly inserted catch block
  }

  // 3. Fix missing window. prefixes for setup functions inside the function body
  for (let i = funcStart; i < funcEnd; i++) {
    lines[i] = lines[i].replace(/setupSupabaseSuggestions\(/g, 'window.setupSupabaseSuggestions(');
    lines[i] = lines[i].replace(/setupSuggestions\(/g, 'window.setupSuggestions(');
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log("Successfully injected using line-based replacement.");
