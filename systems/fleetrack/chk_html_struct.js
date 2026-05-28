const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Check HTML structure integrity
// 1. Count script open/close pairs
const opens = (c.match(/<script[^>]*>/g)||[]).length;
const closes = (c.match(/<\/script>/g)||[]).length;
console.log('script opens:', opens, 'closes:', closes, opens===closes ? 'OK' : 'MISMATCH!');

// 2. Find where our key functions are defined and whether they're intact
const fns = ['openReportPrintModal','closeReportPrintModal','triggerReportPrint','printDBR','printJobCard','printMachineRegister','buildReportHtml'];
fns.forEach(fn => {
  const idx = c.indexOf(fn);
  if(idx>=0) {
    const line = c.substring(0,idx).split('\n').length;
    console.log(fn+': line ~'+line);
  } else {
    console.log(fn+': NOT FOUND!');
  }
});

// 3. Check if the modal HTML is actually in the document body (not inside a script)
const modalIdx = c.lastIndexOf('id="rpt-print-modal"');
const lastScript = c.lastIndexOf('</script>');
const lastBody = c.lastIndexOf('</body>');
console.log('\nModal at offset:', modalIdx, 'line ~'+c.substring(0,modalIdx).split('\n').length);
console.log('Last </script> at offset:', lastScript, 'line ~'+c.substring(0,lastScript).split('\n').length);
console.log('Last </body> at offset:', lastBody, 'line ~'+c.substring(0,lastBody).split('\n').length);
console.log('Modal comes AFTER last </script>?', modalIdx > lastScript ? 'YES' : 'NO - PROBLEM!');

// 4. Check the printCurrentReportPDF function for corrupted content
const printPDFIdx = c.indexOf('window.printCurrentReportPDF');
const chunk = c.substring(printPDFIdx, printPDFIdx+100);
console.log('\nprintCurrentReportPDF start:', JSON.stringify(chunk.substring(0,80)));
