const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// ── 1. Add CSS for ISR as a fixed overlay (after the .hidden rule) ───────────
const hiddenCss = '    .hidden {\n      display: none !important;\n    }';
const isrOverlayCss = `    .hidden {
      display: none !important;
    }
    /* ISR view: fixed overlay so it always covers the viewport cleanly */
    #view-isr:not(.hidden) {
      position: fixed !important;
      top: 56px;
      left: 240px; /* sidebar width */
      right: 0;
      bottom: 0;
      z-index: 90;
      overflow-y: auto;
      background: var(--bg-main, #f8fafc);
      padding: 16px 20px;
      box-sizing: border-box;
    }`;

if (c.includes(hiddenCss) && !c.includes('#view-isr:not(.hidden)')) {
  c = c.replace(hiddenCss, isrOverlayCss);
  console.log('ISR fixed overlay CSS added');
} else if (c.includes('#view-isr:not(.hidden)')) {
  console.log('ISR CSS already exists');
} else {
  console.log('Could not find hidden CSS anchor');
}

// ── 2. Simplify openISRReport — no inline styles needed since CSS handles it ─
const oldFn = `    window.openISRReport = function() {
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

const newFn = `    window.openISRReport = function() {
      console.log('[ISR] openISRReport called');
      // Hide all views (ISR CSS handles the overlay positioning)
      document.querySelectorAll('.view-page, .view-item').forEach(function(el) {
        el.classList.add('hidden');
        el.style.removeProperty('display');
      });
      // Show ISR — CSS makes it a fixed overlay covering the viewport
      var isrView = document.getElementById('view-isr');
      if (!isrView) { console.error('[ISR] #view-isr not found'); return; }
      isrView.classList.remove('hidden');
      isrView.scrollTop = 0;
      console.log('[ISR] view shown as fixed overlay');
      // Load data
      setTimeout(function() {
        if (typeof window.loadISR === 'function') window.loadISR();
      }, 150);
    };`;

if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn);
  console.log('openISRReport simplified');
} else {
  console.log('openISRReport not found by exact match');
  const idx = c.indexOf('window.openISRReport = function()');
  console.log('  Located at char idx:', idx, 'line:', idx >= 0 ? c.substring(0,idx).split('\n').length : -1);
}

// ── 3. Fix showView to clear inline styles on ALL views when navigating away ─
// Also remove the redundant "Clear any force-hide" loop if present
const redundantLoop = `        // Clear any force-hide applied by openISRReport
        document.querySelectorAll('.view-page,.view-item').forEach(function(v){v.style.removeProperty('display');});`;
if (c.includes(redundantLoop)) {
  c = c.replace(redundantLoop, '');
  console.log('Redundant clear loop removed from showView');
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('Done. Size:', c.length);
