const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');

// ── 1. Expose showView globally right after its definition ────────────────
const svDef="    function showView(viewId) {";
const svIdx=c.indexOf(svDef);
const svLine=c.substring(0,svIdx).split('\n').length;
console.log('showView defined at line',svLine);

// Find the closing } of showView
// It starts at svIdx - find next top-level closing brace
// Simpler: find the function definition and add window.showView = showView after the } 
// We'll add it after the entire function. Find the line that says "    }" at same indent after showView
const svEnd=c.indexOf('\n    }\n    \n    ', svIdx); // matches 4-space indent function end
if(svEnd<0){
  // try different pattern
  const svEnd2=c.indexOf('\n    }\n\n    ', svIdx);
  console.log('showView end alt at idx',svEnd2,'line ~'+c.substring(0,svEnd2).split('\n').length);
}

// Actually, search for the line AFTER showView's closing brace
// showView ends just before another top-level declaration
// Find 'function showView' closing - look for '    }' that's followed by the next declaration
const showViewBodyStart=c.indexOf('{', svIdx+svDef.length-1);
// Count braces to find the end
let depth=0, pos=showViewBodyStart;
while(pos<c.length){
  if(c[pos]==='{') depth++;
  if(c[pos]==='}') { depth--; if(depth===0) break; }
  pos++;
}
const svCloseIdx=pos;
const svCloseLine=c.substring(0,svCloseIdx).split('\n').length;
console.log('showView closes at line',svCloseLine);

// Insert window.showView = showView; after the closing brace
if(!c.includes('window.showView = showView')){
  c=c.substring(0,svCloseIdx+1)+'\n    window.showView = showView; // expose globally for inline onclick\n'+c.substring(svCloseIdx+1);
  console.log('window.showView = showView; added');
} else {
  console.log('window.showView already exposed');
}

// ── 2. Fix ISR nav item onclick to use showView (now global) ──────────────
// Remove any existing complex onclick and use simple showView call
// Find the ISR nav item line
const isrNavMark='data-view="view-isr"';
const isrNavIdx=c.indexOf(isrNavMark);
const isrNavLine=c.substring(0,isrNavIdx).split('\n').length;
console.log('ISR nav item at line',isrNavLine);

// Get the full opening tag of the ISR nav div
const isrTagStart=c.lastIndexOf('<div',isrNavIdx);
const isrTagEnd=c.indexOf('>',isrNavIdx)+1;
const currentTag=c.substring(isrTagStart,isrTagEnd);
console.log('Current ISR nav tag:',currentTag.substring(0,120));

// Replace with clean onclick
const newTag='<div class="top-nav-dropdown-item" data-view="view-isr" onclick="window.showView(\'view-isr\')">';
c=c.substring(0,isrTagStart)+newTag+c.substring(isrTagEnd);
console.log('ISR nav onclick updated');

// ── 3. Fix showView to also scroll .main container to top ─────────────────
// The main content area scrolls, not window. Let's scroll the main element.
const scrollFix="      window.scrollTo(0, 0);\n      const target = document.getElementById(viewId);";
if(c.includes(scrollFix)){
  // Update to scroll the main element as well
  c=c.replace(scrollFix, 
    "      window.scrollTo(0, 0);\n      var _mainEl=document.querySelector('.main');if(_mainEl)_mainEl.scrollTop=0;\n      const target = document.getElementById(viewId);"
  );
  console.log('Added .main scroll reset');
}

fs.writeFileSync('index.html',c,'utf8');
console.log('Done. Size:',c.length);
