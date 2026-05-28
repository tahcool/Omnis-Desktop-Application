const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// The target insertion point: just before </main>
const mainClose = '    </main>\r\n  </div>';

// Extract view-service-due block
const svcStart = c.indexOf('\r\n\r\n  <!-- ===== SERVICE DUE VIEW =====');
const custScriptEnd = c.indexOf('  </script>\r\n\r\n</body>');
const blockToMove = c.substring(svcStart, custScriptEnd + '  </script>\r\n\r\n'.length);

console.log('Block length:', blockToMove.length);
console.log('Block starts with:', JSON.stringify(blockToMove.substring(0,60)));
console.log('Main close found:', c.includes(mainClose));

// Remove the block from its current position
let out = c.replace(blockToMove, '');

// Insert it before </main>
out = out.replace(mainClose, blockToMove.trimEnd() + '\r\n\r\n' + mainClose);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', out, 'utf8');
console.log('Done. New total length:', out.length);
