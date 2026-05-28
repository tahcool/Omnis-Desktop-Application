const fs = require('fs');
const html = fs.readFileSync(
  String.raw`C:\Users\Administrator\omnis\systems\fleetrack\index.html`, 'utf8');
const lines = html.split('\n');

// Find EXACT lines with showView function definition
lines.forEach((line, i) => {
  if (line.includes('function showView') || line.includes('function showView(')) {
    console.log(`L${i+1}: ${line.trim().substring(0,100)}`);
  }
});
