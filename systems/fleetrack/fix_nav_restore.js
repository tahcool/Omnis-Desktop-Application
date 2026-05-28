const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// ── 1. Fix showView to clear inline display styles when hiding AND showing ──
const oldShowViewHide = "      views.forEach(v => v.classList.add('hidden'));";
const newShowViewHide = "      views.forEach(v => { v.classList.add('hidden'); v.style.removeProperty('display'); });";

if (c.includes(oldShowViewHide)) {
  c = c.replace(oldShowViewHide, newShowViewHide);
  console.log('showView: hide loop now clears inline display style');
} else {
  console.log('showView hide loop NOT found - checking...');
}

const oldShowViewShow = "        target.classList.remove('hidden');";
const newShowViewShow = "        target.classList.remove('hidden');\n        target.style.removeProperty('display');";

// Replace only the first occurrence (inside showView)
const idx = c.indexOf(oldShowViewShow);
if (idx >= 0) {
  c = c.substring(0, idx) + newShowViewShow + c.substring(idx + oldShowViewShow.length);
  console.log('showView: show also clears inline display style at idx', idx);
} else {
  console.log('showView show line NOT found');
}

// ── 2. Fix openISRReport: don't use inline style for hiding, just use classList ──
const oldHideLoop = `      var allViews = document.querySelectorAll('.view-page, .view-item');
      allViews.forEach(function(el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      });`;

const newHideLoop = `      var allViews = document.querySelectorAll('.view-page, .view-item');
      allViews.forEach(function(el) {
        el.classList.add('hidden');
        el.style.removeProperty('display');
      });`;

if (c.includes(oldHideLoop)) {
  c = c.replace(oldHideLoop, newHideLoop);
  console.log('openISRReport: hide loop fixed (no inline style poisoning)');
} else {
  console.log('openISRReport hide loop NOT found');
}

// ── 3. Fix openISRReport: show ISR with removeProperty then let CSS handle it ──
const oldShowISR = `      isrView.classList.remove('hidden');
      isrView.style.setProperty('display', 'flex', 'important');`;

const newShowISR = `      isrView.classList.remove('hidden');
      isrView.style.removeProperty('display');`;

if (c.includes(oldShowISR)) {
  c = c.replace(oldShowISR, newShowISR);
  console.log('openISRReport: show ISR uses CSS class only (no inline style)');
} else {
  console.log('openISRReport show ISR NOT found');
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('Done. Size:', c.length);
