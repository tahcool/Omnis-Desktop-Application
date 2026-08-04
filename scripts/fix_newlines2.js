const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// Use string replacement to replace literal "\n" characters
content = content.replace('</svg>\\n              Add <span class="term-machine">Machine</span>\\n            </button>',
  '</svg>\n              Add <span class="term-machine">Machine</span>\n            </button>');
  
content = content.replace('</svg>\\n                  Add <span class="term-machine">Machine</span>\\n                </button>',
  '</svg>\n                  Add <span class="term-machine">Machine</span>\n                </button>');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed literal newlines');
