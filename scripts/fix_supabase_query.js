const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

content = content.replace(
  /table: 'ft_technician_hour_log',\s*action: 'select',\s*query: '\*'/g,
  "table: 'ft_technician_hour_log',\n          method: 'select',\n          params: { columns: '*' }"
);

fs.writeFileSync('systems/fleetrack/index.html', content);
console.log('Successfully replaced payload structure.');
