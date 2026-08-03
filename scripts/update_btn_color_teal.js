const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const lines = content.split('\n');
let replaced = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('openLogHoursModal()')) {
    // We found the button line
    for (let j = i; j < i + 5; j++) {
      if (lines[j] && lines[j].includes('background:#d97706')) {
        lines[j] = lines[j].replace('background:#d97706', 'background:#0d9488');
      }
      if (lines[j] && lines[j].includes("this.style.background='#b45309'")) {
        lines[j] = lines[j].replace("this.style.background='#b45309'", "this.style.background='#0f766e'");
      }
      if (lines[j] && lines[j].includes("this.style.background='#d97706'")) {
        lines[j] = lines[j].replace("this.style.background='#d97706'", "this.style.background='#0d9488'");
      }
    }
    replaced = true;
    break;
  }
}

if (replaced) {
  fs.writeFileSync('systems/fleetrack/index.html', lines.join('\n'));
  console.log('Successfully updated Log Tech Hours button to Teal');
} else {
  console.log('Failed to find button to replace color.');
}
