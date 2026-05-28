const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
// Check line 6482 and nearby
for(let i=6478;i<=6488;i++) console.log(i+': '+lines[i-1]);
// Check if ISR onclick is there
console.log('\nISR nav onclick:', c.includes('data-view=\"view-isr\" onclick'));
console.log('view-isr div:', c.includes('id=\"view-isr\"'));
console.log('window.loadISR:', c.includes('window.loadISR'));
console.log('File size:', c.length);
console.log('Total lines:', lines.length);
