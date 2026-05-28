const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');

// Update openISRReport to use a more aggressive approach
const oldFn=`    window.openISRReport = function() {
      console.log('[ISR] openISRReport called');
      // Hide all view-page and view-item elements
      document.querySelectorAll('.view-page, .view-item').forEach(function(el) {
        el.classList.add('hidden');
        el.style.removeProperty('display');
      });
      // Show the ISR view
      var isrView = document.getElementById('view-isr');
      if (!isrView) {
        console.error('[ISR] #view-isr not found in DOM!');
        return;
      }
      isrView.classList.remove('hidden');
      isrView.style.display = 'flex';
      // Scroll to top
      window.scrollTo(0, 0);
      var mainEl = document.querySelector('.main');
      if (mainEl) mainEl.scrollTop = 0;
      console.log('[ISR] view-isr shown');
      // Load data after a short delay
      setTimeout(function() {
        if (typeof window.loadISR === 'function') {
          window.loadISR();
        } else {
          console.warn('[ISR] window.loadISR not yet defined');
        }
      }, 150);
    };`;

const newFn=`    window.openISRReport = function() {
      console.log('[ISR] openISRReport called');
      // Step 1: Hard-hide every view element including view-dashboard
      var allViews = document.querySelectorAll('.view-page, .view-item');
      allViews.forEach(function(el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
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
      isrView.style.setProperty('display', 'flex', 'important');
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

if(c.includes(oldFn)){
  c=c.replace(oldFn,newFn);
  console.log('openISRReport updated with aggressive hide + scroll');
} else {
  console.log('Could not find openISRReport text - checking...');
  const idx=c.indexOf('window.openISRReport = function()');
  console.log('Found at idx:',idx,'line:',idx>=0?c.substring(0,idx).split('\n').length:-1);
}

fs.writeFileSync('index.html',c,'utf8');
console.log('Done. Size:',c.length);
