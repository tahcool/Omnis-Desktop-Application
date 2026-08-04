const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// I will just use string replacement
content = content.split('\\n              Add <span class="term-machine">Machine</span>\\n            </button>').join('\\n              Add <span class="term-machine">Machine</span>\\n            </button>');
content = content.split('\\n                  Add <span class="term-machine">Machine</span>\\n                </button>').join('\\n                  Add <span class="term-machine">Machine</span>\\n                </button>');

// If there's any literal `\n` in the file around Add Machine
content = content.replaceAll('\\\\n              Add <span class="term-machine">Machine</span>\\\\n            </button>',
  '\\n              Add <span class="term-machine">Machine</span>\\n            </button>');

content = content.replaceAll('\\\\n                  Add <span class="term-machine">Machine</span>\\\\n                </button>',
  '\\n                  Add <span class="term-machine">Machine</span>\\n                </button>');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed literal newlines');
