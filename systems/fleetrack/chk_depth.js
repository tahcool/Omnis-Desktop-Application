const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Count div depth at lines 3555 (view-machines start) to 3800 (after ISR insert)
const vmStart=c.indexOf('id="view-machines"');
const vmStartLine=c.substring(0,vmStart).split('\n').length;
console.log('view-machines div starts at line',vmStartLine);

let depth=0;
let vmClosed=false;
for(let i=vmStartLine-1;i<Math.min(lines.length,3830);i++){
  const l=lines[i];
  // Count opening and closing tags
  const opens=(l.match(/<div[\s>]/g)||[]).length + (l.match(/<div\/>/g)||[]).length;
  const closes=(l.match(/<\/div>/g)||[]).length;
  depth += opens - closes;
  if(!vmClosed && depth===0 && i>vmStartLine){
    console.log('view-machines CLOSES at line',(i+1),'depth returns to 0');
    vmClosed=true;
  }
  if(i>=3759 && i<=3800){
    console.log((i+1)+' [depth='+depth+']: '+l.substring(0,80).trim());
  }
}
