const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Block 2 starts at line 5482 (0-indexed: 5481)
// Try the code directly
const code = lines.slice(5482, 11551).join('\n');
// Find first token error
const firstLine = code.split('\n')[0];
console.log('First line of code:', JSON.stringify(firstLine.substring(0,100)));
// Check if there's a BOM or special char at start
const firstChars = code.substring(0,50);
console.log('First 50 chars hex:', Buffer.from(firstChars).toString('hex').substring(0,100));
// Try just first 100 chars
try { new Function(code.substring(0,200)); console.log('First 200 chars: OK'); }
catch(e) { console.log('First 200 chars ERROR:', e.message, JSON.stringify(code.substring(0,200))); }
