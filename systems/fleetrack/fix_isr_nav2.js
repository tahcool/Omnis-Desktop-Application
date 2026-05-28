const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// Fix openISRReport: explicitly hide view-dashboard by ID + use fixed positioning approach
const oldFn = `    window.openISRReport = function() {
      console.log('[ISR] openISRReport called');
      // Step 1: Hard-hide every view element including view-dashboard
      var allViews = document.querySelectorAll('.view-page, .view-item');
      allViews.forEach(function(el) {
        el.classList.add('hidden');
        el.style.removeProperty('display');
      });
      // Step 2: Force scroll to top on ALL possible scroll containers
      window.scrollTo({top:0,behavior:'instant'});
      var scrollEls = document.querySelectorAll('.main, .app-shell, body, html, main');
      scrollEls.forEach(function(el){ el.scrollTop = 0; });
      // Step 3: Show the ISR view
      var isrView = document.getElementById('view-isr');
      if (!isrView) {
        console.error('[ISR] #view-isr not found in DOM!');
        return;
      }
      isrView.classList.remove('hidden');
      isrView.style.removeProperty('display');
      console.log('[ISR] view-isr shown. Dashboard hidden:', document.getElementById('view-dashboard') ? window.getComputedStyle(document.getElementById('view-dashboard')).display : 'N/A');
      // Step 4: Load data
      setTimeout(function() {
        if (typeof window.loadISR === 'function') {
          window.loadISR();
        } else {
          console.warn('[ISR] window.loadISR not yet defined');
        }
      }, 150);
    };`;

const newFn = `    window.openISRReport = function() {
      console.log('[ISR] openISRReport called');
      // Hide all views via CSS class
      document.querySelectorAll('.view-page, .view-item').forEach(function(el) {
        el.classList.add('hidden');
        el.style.removeProperty('display');
      });
      // Extra: force-hide view-dashboard specifically
      var db = document.getElementById('view-dashboard');
      if (db) { db.style.setProperty('display','none','important'); }
      // Show ISR using fixed overlay so scroll position doesn't matter
      var isrView = document.getElementById('view-isr');
      if (!isrView) { console.error('[ISR] #view-isr not found'); return; }
      isrView.classList.remove('hidden');
      isrView.style.removeProperty('display');
      // Scroll every possible container to top
      try { window.scrollTo({top:0,left:0,behavior:'instant'}); } catch(e) { window.scrollTo(0,0); }
      ['body','html','.main','.app-main','main'].forEach(function(sel){
        var el = sel.startsWith('.') || sel==='main' ? document.querySelector(sel) : document.getElementsByTagName(sel)[0];
        if (el) el.scrollTop = 0;
      });
      isrView.scrollTop = 0;
      console.log('[ISR] view shown');
      // Load data
      setTimeout(function() {
        if (typeof window.loadISR === 'function') window.loadISR();
      }, 150);
    };`;

// Also update showView to clear view-dashboard inline style when navigating away from ISR
const showViewShow = "        target.classList.remove('hidden');\n        target.style.removeProperty('display');";
const showViewShowNew = "        target.classList.remove('hidden');\n        target.style.removeProperty('display');\n        // Clear any force-hide applied by openISRReport\n        document.querySelectorAll('.view-page,.view-item').forEach(function(v){v.style.removeProperty('display');});";

if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn);
  console.log('openISRReport updated');
} else {
  console.log('openISRReport not found by exact match');
  const idx = c.indexOf('window.openISRReport = function()');
  console.log('Found at char idx:', idx, 'line:', idx >= 0 ? c.substring(0, idx).split('\n').length : -1);
}

if (c.includes(showViewShow) && !c.includes('Clear any force-hide')) {
  c = c.replace(showViewShow, showViewShowNew);
  console.log('showView: inline style cleanup added');
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('Done. Size:', c.length);
