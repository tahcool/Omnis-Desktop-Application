const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Find view-dashboard structure
const vdIdx=c.indexOf('id="view-dashboard"');
const vdLine=vdIdx>=0?c.substring(0,vdIdx).split('\n').length:-1;
console.log('view-dashboard at line',vdLine);

// Find what div contains ALL the views (view-reports, view-machines, view-isr etc)
// These should all be at depth=0 RELATIVE to some wrapper
// Let's find the common parent by checking what OPENS before view-reports
const vrIdx=c.indexOf('id="view-reports"');
const vrLine=c.substring(0,vrIdx).split('\n').length;

// Find the nearest unclosed <div> before view-reports
let depth=0, parents=[];
for(let i=vrLine-2;i>=Math.max(0,vrLine-200);i--){
  const l=lines[i];
  const opens=(l.match(/<div[\s>]/g)||[]).length;
  const closes=(l.match(/<\/div>/g)||[]).length;
  depth+=closes-opens;
  if(opens>0 && closes===0 && depth<=0){ 
    parents.push((i+1)+': '+l.trim().substring(0,100));
    if(parents.length>=5) break;
  }
}
console.log('\nParent divs containing view-reports (should also contain view-isr):');
parents.forEach(p=>console.log(p));

// Also: where in the DOM is the ISR view relative to key landmarks
const isrLine=c.substring(0,c.indexOf('id="view-isr"')).split('\n').length;
const vmLine=c.substring(0,c.indexOf('id="view-machines"')).split('\n').length;
const vrpLine=c.substring(0,c.indexOf('id="view-reports"')).split('\n').length;
console.log('\nview-reports at line',vrpLine,'view-machines at line',vmLine,'view-isr at line',isrLine);

// The MAIN CONTENT DIV - find it
const mainIdx=c.indexOf('<main');
const mainLine=c.substring(0,mainIdx).split('\n').length;
console.log('\n<main> at line',mainLine);
// Show 5 lines inside main
lines.slice(mainLine,mainLine+8).forEach((l,i)=>console.log((mainLine+i+1)+': '+l.substring(0,100)));
