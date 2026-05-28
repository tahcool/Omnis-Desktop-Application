const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// List all top-level divs inside <main> (children of main)
const mainStart=c.indexOf('<main');
const mainEnd=c.indexOf('</main>');
const mainContent=c.substring(mainStart,mainEnd);
const mainLines=mainContent.split('\n');
const mainLineStart=c.substring(0,mainStart).split('\n').length;

// Find direct children by counting depth
let depth=0, inMain=false;
for(let i=0;i<mainLines.length;i++){
  const l=mainLines[i];
  const opens=(l.match(/<div[\s>]/g)||[]).length;
  const closes=(l.match(/<\/div>/g)||[]).length;
  if(i===0){ inMain=true; depth=1; continue; }
  if(depth===1 && opens>0){ 
    console.log('Direct child at line '+(mainLineStart+i-1)+': '+l.trim().substring(0,100));
  }
  depth+=opens-closes;
}
