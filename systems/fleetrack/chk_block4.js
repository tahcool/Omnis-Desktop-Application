const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m, blk = 0;
while((m = re.exec(c)) !== null) {
  blk++;
  if(blk===4) {
    const startLine = c.substring(0,m.index).split('\n').length;
    console.log('Block 4 starts line ~'+startLine+', length:', m[1].length);
    // Find the error by checking substrings
    const code = m[1];
    // Try splitting at backtick-heavy sections 
    const btIdx = code.indexOf('srcdoc =');
    if(btIdx>=0) {
      console.log('srcdoc at offset '+btIdx);
      console.log(JSON.stringify(code.substring(btIdx-50, btIdx+200)));
    }
    // Also find the modal html in the script block - it shouldn't be there
    const modalIdx = code.indexOf('rpt-print-modal');
    if(modalIdx>=0) {
      console.log('\nrpt-print-modal FOUND in script block! at offset:',modalIdx);
      console.log(JSON.stringify(code.substring(modalIdx-20, modalIdx+100)));
    }
  }
}
