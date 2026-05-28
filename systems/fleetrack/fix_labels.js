const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Fix JC modal print button label
c = c.replace(
  '>🖨️ Print PDF</button>',
  '>🖶 Print</button>'
);

// Fix MWR print button (line 10149 "Print PDF" span)
// Find the exact context
const idx = c.indexOf('<span>🖶</span><span>Print PDF</span>');
if(idx>=0) {
  console.log('MWR print btn found at line ~'+c.substring(0,idx).split('\n').length);
  c = c.replace('<span>🖶</span><span>Print PDF</span>', '<span>🖶</span><span>Print</span>');
}

// Fix JC modal print button to open modal
const oldJCModalBtn = `onclick="if(typeof window.CURRENT_JC_ROW!=='undefined'&&window.CURRENT_JC_ROW){window.printJobCard(window.CURRENT_JC_ROW);}else{window.print();}">🖶 Print</button>`;
const newJCModalBtn = `onclick="if(typeof window.CURRENT_JC_ROW!=='undefined'&&window.CURRENT_JC_ROW){window.printJobCard(window.CURRENT_JC_ROW);}else{window.openReportPrintModal&&window.openReportPrintModal();}">🖶 Print</button>`;
console.log('JC modal btn found:', c.includes(oldJCModalBtn));
c = c.replace(oldJCModalBtn, newJCModalBtn);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
