const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');

// ─── 1. Find </body> to inject global script just before it ─────────────────
const bodyClose=c.lastIndexOf('</body>');
if(bodyClose<0){ console.log('</body> NOT FOUND'); process.exit(1); }
const bodyCloseLine=c.substring(0,bodyClose).split('\n').length;
console.log('</body> at line',bodyCloseLine);

// ─── 2. The global openISRReport function ────────────────────────────────────
const globalScript=`
  <!-- ISR Global Navigation Script -->
  <script>
    window.openISRReport = function() {
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
    };
  </script>

`;

// Check if already exists
if(c.includes('window.openISRReport')){
  console.log('openISRReport already exists - removing old version first');
  // Remove from </body>
  const oldStart=c.indexOf('\n  <!-- ISR Global Navigation Script -->');
  const oldEnd=c.indexOf('</script>\n\n', oldStart)+10;
  if(oldStart>=0 && oldEnd>oldStart){
    c=c.substring(0,oldStart)+c.substring(oldEnd);
    console.log('Old script removed');
  }
}

c=c.substring(0,bodyClose)+globalScript+c.substring(bodyClose);
console.log('Global openISRReport script injected before </body>');

// ─── 3. Update the ISR nav item onclick to call openISRReport ────────────────
// Find the ISR nav item
const isrNavStart=c.indexOf('data-view="view-isr"');
if(isrNavStart<0){ console.log('ISR nav NOT FOUND'); process.exit(1); }
const tagOpen=c.lastIndexOf('<div',isrNavStart);
const tagClose=c.indexOf('>',isrNavStart)+1;
const currentTag=c.substring(tagOpen,tagClose);
console.log('Current ISR nav tag:',currentTag.substring(0,150));

const newTag='<div class="top-nav-dropdown-item" data-view="view-isr" onclick="window.openISRReport()">';
c=c.substring(0,tagOpen)+newTag+c.substring(tagClose);
console.log('ISR nav onclick → openISRReport()');

// ─── 4. Save ─────────────────────────────────────────────────────────────────
fs.writeFileSync('index.html',c,'utf8');
console.log('Done. Size:',c.length);
