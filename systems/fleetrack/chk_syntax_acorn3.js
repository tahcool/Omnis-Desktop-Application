const fs = require('fs');
const vm = require('vm');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Check if there's a char before the block start that shouldn't be there
const line5482 = lines[5481]; // 0-indexed
console.log('Line 5482:', JSON.stringify(line5482));
const line5483 = lines[5482];
console.log('Line 5483:', JSON.stringify(line5483.substring(0,60)));
// Check for the html2pdf script - maybe it injected something
const line5480 = lines[5479];
console.log('Line 5480:', JSON.stringify(line5480));
// Check if this error is pre-existing - search for anything new near this block
// The real issue might be the modal html got injected in the wrong place
const modalIdx = c.indexOf('rpt-print-modal');
console.log('rpt-print-modal at line ~'+c.substring(0,modalIdx).split('\n').length);
// Check if modal is inside a script tag
const nearScript = c.substring(Math.max(0,modalIdx-200), modalIdx+50);
console.log('Context before modal:', JSON.stringify(nearScript.substring(0,150)));
