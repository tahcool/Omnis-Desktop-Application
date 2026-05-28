const fs = require('fs');
const html = fs.readFileSync(
  String.raw`C:\Users\Administrator\omnis\systems\fleetrack\index.html`, 'utf8');
const lines = html.split('\n');

// Find all <script and </script> with line numbers
lines.forEach((line, i) => {
  const l = line.trim();
  if (l.includes('<script') || l.includes('</script>')) {
    console.log(`L${i+1}: ${l.substring(0,120)}`);
  }
});
