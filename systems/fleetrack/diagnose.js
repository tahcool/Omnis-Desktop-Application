const fs = require('fs');
const content = fs.readFileSync('_check_syntax.js', 'utf8');

const showViewCount = (content.match(/function showView/g) || []).length;
console.log('showView definitions:', showViewCount);

const loadRptCount = (content.match(/async function loadRpt/g) || []).length;
console.log('loadRpt functions:', loadRptCount);

const defIdx = content.indexOf('FT_DEFECT_SUMMARY_METHOD');
const defDef = content.indexOf('const FT_DEFECT_SUMMARY_METHOD');
console.log('FT_DEFECT_SUMMARY_METHOD first use at char:', defIdx, '| defined at char:', defDef);
console.log('Used before defined:', defIdx < defDef && defDef !== -1);

console.log('FT_GET_SERVICE_PLAN_LIST_METHOD defined:', content.includes('const FT_GET_SERVICE_PLAN_LIST_METHOD'));
console.log('FT_BREAKDOWN_DBR_METHOD defined:', content.includes('const FT_BREAKDOWN_DBR_METHOD'));

// Check for the rpt view CSS and HTML markers
const htmlFile = fs.readFileSync(
  String.raw`C:\Users\Administrator\omnis\systems\fleetrack\index.html`, 'utf8');

// Find unclosed tags or broken structure
const scriptTags = (htmlFile.match(/<script/g) || []).length;
const scriptEndTags = (htmlFile.match(/<\/script>/g) || []).length;
console.log('\nHTML checks:');
console.log('  <script> tags:', scriptTags, '| </script> tags:', scriptEndTags, '| balanced:', scriptTags === scriptEndTags);

const divOpen = (htmlFile.match(/<div/g) || []).length;
const divClose = (htmlFile.match(/<\/div>/g) || []).length;
console.log('  <div> open:', divOpen, '| </div> close:', divClose, '| diff:', divOpen - divClose);

// Check the injected RPT JS was placed correctly
console.log('  loadRptMachineReg in file:', htmlFile.includes('async function loadRptMachineReg()'));
console.log('  view-rpt-machine-reg in file:', htmlFile.includes('id="view-rpt-machine-reg"'));
console.log('  </body> present:', htmlFile.includes('</body>'));
console.log('  </html> present:', htmlFile.includes('</html>'));

// Find where the injected JS ended up relative to </script> and </body>
const rptJsIdx = htmlFile.indexOf('async function loadRptMachineReg()');
const closingScript = htmlFile.lastIndexOf('</script>');
const closingBody = htmlFile.lastIndexOf('</body>');
console.log('\nPosition checks:');
console.log('  loadRptMachineReg at:', rptJsIdx);
console.log('  last </script> at:', closingScript);
console.log('  </body> at:', closingBody);
console.log('  JS is BEFORE </script>:', rptJsIdx < closingScript);
console.log('  </body> is AFTER </script>:', closingBody > closingScript);
