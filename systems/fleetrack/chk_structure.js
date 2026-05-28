const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Find the exact line of view-isr and check 3 lines before it
const vrIdx=c.indexOf('id="view-isr"');
const vrLine=c.substring(0,vrIdx).split('\n').length;
console.log('=== Lines around view-isr ===');
lines.slice(vrLine-5,vrLine+5).forEach((l,i)=>console.log((vrLine-5+i+1)+': '+l));

// Check the script block containing the ISR JS
const loadIsrIdx=c.indexOf('window.loadISR=async');
const loadIsrLine=c.substring(0,loadIsrIdx).split('\n').length;
console.log('\n=== ISR JS at line',loadIsrLine,'===');
lines.slice(loadIsrLine-3,loadIsrLine+3).forEach((l,i)=>console.log((loadIsrLine-3+i+1)+': '+l.substring(0,120)));

// Verify which script block ISR JS is in
let scriptCount=0, blockStart=[];
for(let i=0;i<loadIsrIdx;i++){
  if(c[i]==='<' && c.substring(i,i+7)==='<script') scriptCount++;
}
console.log('\nloadISR is in script block #'+scriptCount);

// Check the FT_ISR_METHOD line
const isrMethodIdx=c.indexOf('FT_ISR_METHOD');
const isrMethodLine=c.substring(0,isrMethodIdx).split('\n').length;
console.log('\nFT_ISR_METHOD at line',isrMethodLine);
lines.slice(isrMethodLine-1,isrMethodLine+2).forEach((l,i)=>console.log((isrMethodLine-1+i+1)+': '+l.substring(0,120)));

// Check if view-isr is inside another view div
console.log('\n=== Checking if view-isr nested inside another view ===');
// Look for .view-page that CONTAINS view-isr
let depth=0, inViewPage=false, parentDiv='';
for(let i=0;i<vrIdx;i++){
  if(c.substring(i).startsWith('<div') && c.substring(i,i+50).includes('view-page')){
    inViewPage=true; parentDiv=c.substring(i,i+80); depth++;
  } else if(c.substring(i).startsWith('<div')){ if(inViewPage) depth++; }
  else if(c.substring(i).startsWith('</div')){ if(inViewPage){ depth--; if(depth<=0){ inViewPage=false; parentDiv=''; depth=0; } } }
}
if(inViewPage) console.log('view-isr IS inside another .view-page div!',parentDiv.substring(0,80));
else console.log('view-isr is NOT nested inside another .view-page div. Structure OK.');
