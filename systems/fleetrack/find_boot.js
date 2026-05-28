const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');
const lines = html.split('\n');

// Find the boot/init code that calls showView at startup
lines.forEach((line, i) => {
  const l = line.trim();
  if ((l.includes('showView(') && !l.includes('function showView') && !l.includes('//')) ||
      l.includes('DOMContentLoaded') ||
      l.includes('window.onload') ||
      (l.includes('Boot') && l.includes('function')) ||
      l.includes('initApp') ||
      l.includes('view-dashboard') && l.includes('showView')) {
    console.log(`L${i+1}: ${l.substring(0, 120)}`);
  }
});
