const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
const mainStart=c.indexOf('<main');
const mainEnd=c.indexOf('</main>');
const mainLines=lines.slice(c.substring(0,mainStart).split('\n').length, c.substring(0,mainEnd).split('\n').length);
const mainLineStart=c.substring(0,mainStart).split('\n').length;

// Find elements that are direct children of <main> but NOT view-page
let depth=0;
let nonViews=[];
for(let i=0;i<mainLines.length;i++){
  const l=mainLines[i];
  const opens=(l.match(/<div[\s>]/g)||[]).length;
  const closes=(l.match(/<\/div>/g)||[]).length;
  if(i===0){depth=1;continue;}
  if(depth===1 && opens>0 && !l.includes('view-page') && !l.includes('view-item') && !l.includes('modal')){
    nonViews.push((mainLineStart+i-1)+': '+l.trim().substring(0,100));
  }
  depth+=opens-closes;
}
console.log('Non-view direct children of <main>:');
nonViews.forEach(v=>console.log(v));

// Show view-dashboard's actual closing line and content range
const vdStart=c.indexOf('id="view-dashboard"');
const vdStartLine=c.substring(0,vdStart).split('\n').length;
let d=0;
for(let i=vdStartLine-1;i<lines.length;i++){
  const l=lines[i];
  const o=(l.match(/<div[\s>]/g)||[]).length;
  const cl=(l.match(/<\/div>/g)||[]).length;
  d+=o-cl;
  if(i>vdStartLine && d<=0){
    console.log('\nview-dashboard closes at line '+(i+1)+' (contains '+(i+1-vdStartLine)+' lines)');
    // Show lines 3200-3304 to see what's in view-dashboard
    break;
  }
}
