const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");

// Extract all <script> blocks
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let blockIdx = 0;
let errors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  blockIdx++;
  const body = match[1];
  const startLine = html.substring(0, match.index).split("\n").length;
  try {
    new Function(body);
  } catch (e) {
    errors++;
    console.error(`[Script Block ${blockIdx} at line ~${startLine}] SYNTAX ERROR: ${e.message}`);
    // Show relevant lines around error
    const lines = body.split("\n");
    const errMatch = e.message.match(/line (\d+)/);
    if (errMatch) {
      const errLine = parseInt(errMatch[1]) - 1;
      const start = Math.max(0, errLine - 3);
      const end = Math.min(lines.length, errLine + 4);
      for (let i = start; i < end; i++) {
        console.log(`  ${startLine + i}: ${lines[i]}`);
      }
    }
  }
}
if (errors === 0) {
  console.log(`All ${blockIdx} script blocks: SYNTAX OK`);
} else {
  console.log(`${errors} errors found across ${blockIdx} script blocks`);
}
