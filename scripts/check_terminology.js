const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

console.log('Registry:', content.includes('term-machine">Machine</span> Registry'));
console.log('Add Button:', content.includes('Add <span class="term-machine">Machine</span>'));
console.log('Placeholder:', content.includes('term-machine-ph'));
console.log('Machine / Model:', content.includes('term-machine" style="text-transform:uppercase;">MACHINE</span> / MODEL'));
console.log('Active Machines:', content.includes('ACTIVE <span class="term-machines"'));
