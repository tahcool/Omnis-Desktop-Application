const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

content = content.replace(
  />Date<\/th>/g,
  ">Technician Name</th>"
);

fs.writeFileSync('systems/fleetrack/index.html', content);
console.log('Successfully replaced Date with Technician Name.');
