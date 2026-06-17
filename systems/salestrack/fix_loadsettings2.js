const fs = require('fs');
const file = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const target = `        // --- API HEALTH UI ---
        // window.updateApiMetricsUI = () => // this.updateApiMetricsUI();
        this.updateApiMetricsUI();`;
const replace = `        // --- API HEALTH UI ---
        // window.updateApiMetricsUI = () => // this.updateApiMetricsUI();
        // this.updateApiMetricsUI();`;

// Normalize line endings to avoid \r\n issues in replace
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('this.updateApiMetricsUI();') && !lines[i].includes('//')) {
        lines[i] = '        // ' + lines[i].trim();
    }
}
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed dashboard_logic.js');
