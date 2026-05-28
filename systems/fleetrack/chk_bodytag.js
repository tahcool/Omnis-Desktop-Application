const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
// Find all </body> and </html> tags
let i = 0;
while(true) {
  const idx = c.indexOf('</body>', i);
  if(idx === -1) break;
  const line = c.substring(0,idx).split('\n').length;
  console.log('</body> at line ~'+line+':', JSON.stringify(c.substring(idx-30, idx+50)));
  i = idx + 1;
}
