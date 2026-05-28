const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find what comes after view-machines closing
const vmIdx = c.indexOf('id="view-machines"');
let pos=vmIdx, depth=0, started=false;
while(pos<c.length){
  if(!started && c[pos]==='<' && c[pos+1]!=='/'){ depth=1; started=true; pos++; continue; }
  if(started){
    if(c[pos]==='<' && c[pos+1]!=='/' && c[pos+1]!=='!') depth++;
    if(c[pos]==='<' && c[pos+1]==='/') depth--;
    if(depth===0){ 
      const endLine = c.substring(0,pos).split('\n').length;
      console.log('view-machines closes at line ~'+endLine);
      lines.slice(endLine-1,endLine+6).forEach((l,i)=>console.log((endLine+i)+': '+l.substring(0,100)));
      break;
    }
  }
  pos++;
}
// Also check if view-isr already exists
console.log('\nview-isr exists:', c.includes('id="view-isr"'));
console.log('loadISR exists:', c.includes('window.loadISR'));
console.log('FT_ISR_METHOD exists:', c.includes('FT_ISR_METHOD'));
