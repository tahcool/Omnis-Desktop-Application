const fs = require('fs');
const file = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('window.updateApiMetricsUI = () => this.updateApiMetricsUI();', '// window.updateApiMetricsUI = () => this.updateApiMetricsUI();');
content = content.replace('this.updateApiMetricsUI();', '// this.updateApiMetricsUI();');

fs.writeFileSync(file, content, 'utf8');
console.log('Patched dashboard_logic.js');
