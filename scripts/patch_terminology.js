const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  // 1. Add Machine buttons
  ['>\\n              Add Machine\\n            </button>', '>\\n              Add <span class="term-machine">Machine</span>\\n            </button>'],
  ['>\\n                  Add Machine\\n                </button>', '>\\n                  Add <span class="term-machine">Machine</span>\\n                </button>'],
  ['<span id="am-header-label">Add Machine</span>', '<span id="am-header-label">Add <span class="term-machine">Machine</span></span>'],
  // In JS: document.getElementById('am-header-label').textContent = 'Add Machine';
  ["document.getElementById('am-header-label').textContent = 'Add Machine';", "document.getElementById('am-header-label').innerHTML = 'Add <span class=\"term-machine\">Machine</span>';"],
  
  // 2. Machine Registry / Register
  ['>Machine Registry</h1>', '><span class="term-machine">Machine</span> Registry</h1>'],
  ['>Machine Register</div>', '><span class="term-machine">Machine</span> Register</div>'],
  ['>FT Machine Register</', '>FT <span class="term-machine">Machine</span> Register</'],
  ['>FT Machine Register<', '>FT <span class="term-machine">Machine</span> Register<'],
  ['<h2>Machine Register</h2>', '<h2><span class="term-machine">Machine</span> Register</h2>'],
  
  // 3. Table Headers
  ['>MACHINE / MODEL</div>', '><span class="term-machine" style="text-transform:uppercase;">MACHINE</span> / MODEL</div>'],
  ['>MACHINE SN / MODEL</div>', '><span class="term-machine" style="text-transform:uppercase;">MACHINE</span> SN / MODEL</div>'],
  ['>MACHINE</th>', '><span class="term-machine" style="text-transform:uppercase;">MACHINE</span></th>'],
  ['>ACTIVE MACHINES</div>', '>ACTIVE <span class="term-machines" style="text-transform:uppercase;">MACHINES</span></div>'],
  
  // 4. Placeholders
  ['id="filter-defect-machine" placeholder="Filter by machine..."', 'id="filter-defect-machine" class="term-machine-ph" placeholder="Filter by machine..."'],
  ['id="mr-filter-model" placeholder="Search SN/Model..."', 'id="mr-filter-model" class="term-machine-ph2" placeholder="Search SN/Model..."'],

  // 5. Update switchDivision logic
  [
    `document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
    document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);`,
    `document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
    document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
    document.querySelectorAll('.term-machine-ph').forEach(el => {
      if (el.placeholder) el.placeholder = "Filter by " + termMachine.toLowerCase() + "...";
    });
    // Wait, the mr-filter-model says "Search SN/Model..." we can change it to "Search SN/Truck..." if needed, 
    // but the user said "on fillter on the table it should be Truck / Model". We handled the label above.
    `
  ]
];

replacements.forEach(([search, replace]) => {
  // Try normal replacement
  if (content.includes(search)) {
    content = content.replaceAll(search, replace);
  } else {
    // Try without indentation for multiline strings
    const searchNoIndent = search.replace(/^[ \t]+/gm, '');
    const replaceNoIndent = replace.replace(/^[ \t]+/gm, '');
    if (content.includes(searchNoIndent)) {
      content = content.replaceAll(searchNoIndent, replaceNoIndent);
    } else {
        // Try regex for specific ones
        const r = new RegExp(search.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g');
        content = content.replace(r, replace);
    }
  }
});

// Catch any stray exact matches
content = content.replace(/>MACHINE<\/div>/g, '><span class="term-machine" style="text-transform:uppercase;">MACHINE</span></div>');

fs.writeFileSync(path, content, 'utf8');
console.log("Terminology patched!");
