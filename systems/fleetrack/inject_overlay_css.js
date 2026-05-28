const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const overlayCss = `
    /* ISR: fixed overlay — covers full viewport below the 80px top nav */
    #view-isr:not(.hidden) {
      position: fixed !important;
      top: 80px;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 7999;
      overflow-y: auto;
      background: #f8fafc;
      padding: 24px 28px;
      box-sizing: border-box;
    }
`;

if (!c.includes('#view-isr:not(.hidden) {')) {
  c = c.replace('</style>', overlayCss + '\n  </style>');
  fs.writeFileSync('index.html', c, 'utf8');
  console.log('Overlay CSS added safely before </style>.');
} else {
  console.log('Overlay CSS already present.');
}
