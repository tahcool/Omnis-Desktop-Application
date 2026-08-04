const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['<label>Machine / Model</label>', '<label><span class="term-machine">Machine</span> / Model</label>'],
  ['Machine / Model</th>', '<span class="term-machine">Machine</span> / Model</th>'],
  ['>Active Machines</div>', '>Active <span class="term-machines">Machines</span></div>']
];

replacements.forEach(([search, replace]) => {
  if (content.includes(search)) {
    content = content.replaceAll(search, replace);
  } else {
    console.log("Could not find:", search);
  }
});

fs.writeFileSync(path, content, 'utf8');
console.log("Secondary terminology patched!");
