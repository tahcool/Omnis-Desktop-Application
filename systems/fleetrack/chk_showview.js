const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Check what scope showView is defined in
const svLine=c.indexOf('function showView(viewId)');
const svLineNum=c.substring(0,svLine).split('\n').length;
console.log('showView at line',svLineNum);
// Show context before showView (what script block/scope)
lines.slice(svLineNum-15,svLineNum+2).forEach((l,i)=>console.log((svLineNum-15+i+1)+': '+l.substring(0,100)));

// Find what's around view-isr in the main HTML area
const vrIdx=c.indexOf('id="view-isr"');
const vrLine=c.substring(0,vrIdx).split('\n').length;
console.log('\nview-isr at line',vrLine);
// Show parent context - go back 30 lines and look for parent divs
let depth=0;
for(let i=vrLine-2;i>=Math.max(0,vrLine-60);i--){
  const l=lines[i];
  if(/<\/div/.test(l)) depth++;
  if(/<div/.test(l) && !/<\/div/.test(l)) depth--;
  if(depth<0){ console.log('Parent at line '+(i+1)+': '+l.substring(0,100)); depth=0; }
}
