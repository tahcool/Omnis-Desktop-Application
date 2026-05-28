const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');
const lines = html.split('\n');

// Find view-page CSS and main layout CSS
let found = false;
lines.forEach((line, i) => {
  const l = line.trim();
  if (l.includes('.view-page') || l.includes('.view-item') || l.includes('main.main')) {
    if (!found) { found = true; }
    console.log(`L${i+1}: ${l.substring(0, 120)}`);
  }
});
