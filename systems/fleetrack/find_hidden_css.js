const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');
const lines = html.split('\n');

// Find .hidden CSS definition
lines.forEach((line, i) => {
  if (line.includes('.hidden') && (line.includes('display') || line.includes('visibility') || line.includes('opacity') || line.includes('{') || line.includes('}'))) {
    console.log(`L${i+1}: ${lines[i].trim().substring(0, 120)}`);
  }
});
