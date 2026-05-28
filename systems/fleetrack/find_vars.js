const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');
const lines = html.split('\n');

// Find viewDashboard, viewReports etc variable definitions
lines.forEach((line, i) => {
  const l = line.trim();
  if (/\b(const|let|var)\s+(viewDashboard|viewReports|viewBreakdowns|viewMachines|viewIsr|viewDefects|viewFsi|viewArchives|mainTitle|mainSubtitle|btnPrimaryAction)\b/.test(l)) {
    console.log(`L${i+1}: ${l.substring(0, 120)}`);
  }
});
