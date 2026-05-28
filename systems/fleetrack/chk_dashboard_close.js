const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Find where view-dashboard CLOSES
const vdStart=c.indexOf('id="view-dashboard"');
const vdLine=c.substring(0,vdStart).split('\n').length;

let depth=0;
for(let i=vdLine-1;i<lines.length;i++){
  const l=lines[i];
  const opens=(l.match(/<div[\s>]/g)||[]).length;
  const closes=(l.match(/<\/div>/g)||[]).length;
  depth+=opens-closes;
  if(i>=vdLine-1 && depth<=0){
    console.log('view-dashboard CLOSES at line '+(i+1)+', depth='+depth);
    lines.slice(i-1,i+4).forEach((ll,j)=>console.log((i+j)+': '+ll.substring(0,100)));
    break;
  }
}
