const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
// Find dropdown JS logic
for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(l.includes('top-nav-dropdown') || l.includes('dropdown') && (l.includes('click')||l.includes('close')||l.includes('toggle')||l.includes('stopProp'))){
    if(!l.includes('//')) console.log((i+1)+': '+l.substring(0,120));
  }
}
