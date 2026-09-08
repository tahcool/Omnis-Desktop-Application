const fs = require('fs');
const html = fs.readFileSync('c:/Users/Administrator/omnis/systems/salestrack/index.html', 'utf8');

let inScript = false;
let scriptContent = '';
let startLine = 0;
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<script>') || line.includes('<script type="text/javascript">') || line.includes('<script type="module">')) {
        inScript = true;
        startLine = i + 1;
        scriptContent = '';
        continue;
    }
    
    if (inScript && line.includes('</script>')) {
        inScript = false;
        try {
            new Function(scriptContent);
        } catch (e) {
            console.log(`Syntax error in script starting at line ${startLine}:\n${e.message}`);
        }
        continue;
    }
    
    if (inScript) {
        scriptContent += line + '\n';
    }
}
console.log("Check complete.");
