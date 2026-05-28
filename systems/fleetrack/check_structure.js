const fs = require('fs');
const html = fs.readFileSync(
  'C:\\Users\\Administrator\\omnis\\systems\\fleetrack\\index.html', 'utf8');
const lines = html.split('\n');

// Find the area around view-rpt-gdr to see its full structure
let start = -1;
lines.forEach((line, i) => {
  if (line.includes('id="view-rpt-gdr"')) start = i;
});

if (start >= 0) {
  console.log('=== view-rpt-gdr structure ===');
  for (let i = start; i < Math.min(start + 15, lines.length); i++) {
    console.log(`L${i+1}: ${lines[i].substring(0,120)}`);
  }
}

// Check CSS injection
const hasCss = html.includes('.rpt-view-wrap {');
const hasTableCss = html.includes('.rpt-table {');
const hasViewWrap = html.includes('class="rpt-view-wrap"');
console.log('\n=== CSS/HTML Checks ===');
console.log('rpt-view-wrap CSS:', hasCss);
console.log('rpt-table CSS:', hasTableCss);
console.log('rpt-view-wrap class used in HTML:', hasViewWrap);

// Check where the views are relative to </main> and </body>
const mainClose = html.lastIndexOf('</main>');
const bodyClose = html.lastIndexOf('</body>');
const gdrIdx = html.indexOf('id="view-rpt-gdr"');
console.log('\n=== Position Checks ===');
console.log('</main> at char:', mainClose);
console.log('</body> at char:', bodyClose);
console.log('view-rpt-gdr at char:', gdrIdx);
console.log('GDR is AFTER </main>:', gdrIdx > mainClose);
console.log('GDR is BEFORE </body>:', gdrIdx < bodyClose);

// Check the Frappe viewer overlay CSS
const viewerHidden = html.includes('display:none !important');
console.log('\nFrappe viewer overlay hidden:', viewerHidden);
