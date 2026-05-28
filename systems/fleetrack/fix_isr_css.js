const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const isrOverlayCss = `
    /* ISR view: fixed overlay so it always covers the viewport cleanly */
    #view-isr:not(.hidden) {
      position: fixed !important;
      top: 56px;
      left: 240px; /* sidebar width */
      right: 0;
      bottom: 0;
      z-index: 90;
      overflow-y: auto;
      background: var(--bg-main, #f8fafc);
      padding: 16px 20px;
      box-sizing: border-box;
    }
`;

if(!c.includes('#view-isr:not(.hidden)')) {
    let styleEnd = c.indexOf('</style>');
    if(styleEnd >= 0) {
        c = c.substring(0, styleEnd) + isrOverlayCss + '\n' + c.substring(styleEnd);
        console.log("Injected CSS before </style>");
        fs.writeFileSync('index.html', c, 'utf8');
    }
} else {
    console.log("CSS already present");
}
