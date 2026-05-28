const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
console.log('loadISR:', c.includes('window.loadISR'));
console.log('printISR:', c.includes('window.printISR'));
console.log('view-isr:', c.includes('id="view-isr"'));
console.log('FT_ISR:', c.includes('FT_ISR_METHOD'));
