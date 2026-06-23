const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/omnis/systems/salestrack/index.html', 'utf8');
const lines = html.split('\n');
const matching = lines.map((l, i) => l.includes('id="settings-tab-') ? i : -1).filter(i => i !== -1);
console.log('Tab lines:', matching);
