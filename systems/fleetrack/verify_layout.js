const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const mainClose = c.indexOf('</main>');
const svcIdx = c.indexOf('view-service-due');
const custIdx = c.indexOf('view-customers');
console.log('</main> at:', mainClose);
console.log('view-service-due at:', svcIdx, svcIdx < mainClose ? '(INSIDE main ?)' : '(OUTSIDE main ?)');
console.log('view-customers at:', custIdx, custIdx < mainClose ? '(INSIDE main ?)' : '(OUTSIDE main ?)');
