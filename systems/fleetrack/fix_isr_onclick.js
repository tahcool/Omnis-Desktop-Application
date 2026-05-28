const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');

// Fix the ISR nav onclick to use showView properly + scroll to top
const oldOnclick=`onclick="(function(){console.log('[ISR] Nav clicked — direct handler');document.querySelectorAll('.view-page,.view-item').forEach(function(v){v.classList.add('hidden');});var t=document.getElementById('view-isr');if(t){t.classList.remove('hidden');t.style.display='block';console.log('[ISR] view-isr shown');}else{console.error('[ISR] view-isr NOT FOUND');}if(typeof window.loadISR==='function')window.loadISR();})()\"`;

const newOnclick=`onclick="showView('view-isr')"`;

if(c.includes(oldOnclick)){
  c=c.replace(oldOnclick,newOnclick);
  console.log('Fixed ISR onclick back to showView');
} else {
  console.log('old onclick NOT FOUND - checking current state');
  const isrNavIdx=c.indexOf('data-view="view-isr"');
  if(isrNavIdx>=0){
    const lineNum=c.substring(0,isrNavIdx).split('\n').length;
    console.log('ISR nav item at line',lineNum);
    const chunk=c.substring(isrNavIdx-10,isrNavIdx+200);
    console.log('Current nav item:',chunk.substring(0,200));
  }
}

// Now fix the showView function to scroll to top when switching views
const showViewScroll="      const target = document.getElementById(viewId);";
const showViewScrollNew="      window.scrollTo(0, 0);\n      const target = document.getElementById(viewId);";
if(!c.includes('window.scrollTo(0, 0)') && c.includes(showViewScroll)){
  c=c.replace(showViewScroll, showViewScrollNew);
  console.log('Added scroll-to-top in showView');
} else {
  console.log('scrollTo already present or target not found');
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('Done. Size:', c.length);
