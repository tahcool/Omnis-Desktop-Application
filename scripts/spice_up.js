const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Update :root variables for softer shadows and 16px radius
content = content.replace(
  /--radius: 12px;.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n/m,
  `--radius: 16px; /* Professional business-app radius */
      --font-main: 'Inter', 'Plus Jakarta Sans', sans-serif;

      /* Professional flat-layered shadow */
      --shadow-sm: 0 4px 12px -2px rgba(0, 0, 0, 0.04);
      --shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 8px 12px -6px rgba(0, 0, 0, 0.04);
      --shadow-lg: 0 24px 48px -12px rgba(0, 0, 0, 0.15);
      
      --border-color: #e5e7eb;
      --glass-bg: rgba(255, 255, 255, 0.7);
      --glass-border: rgba(255, 255, 255, 0.5);
`
);

// 2. Update .stat-card to glassmorphism
const statCardOld = `.stat-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s;
    }`;

const statCardNew = `.stat-card {
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: var(--radius);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--glass-border);
      border-bottom-color: rgba(0,0,0,0.05);
      border-right-color: rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    
    .dark .stat-card {
      background: rgba(15, 23, 42, 0.65);
      border-color: rgba(255,255,255,0.05);
      border-bottom-color: rgba(0,0,0,0.2);
      border-right-color: rgba(0,0,0,0.2);
    }`;

content = content.replace(statCardOld, statCardNew);

// Adjust dark mode overrides for glass-bg
content = content.replace(
  /--bg-card: #0f172a; \/\* Slate 900 \*\//,
  `--bg-card: #0f172a; /* Slate 900 */
      --glass-bg: rgba(15, 23, 42, 0.65);
      --glass-border: rgba(255, 255, 255, 0.05);`
);

// 3. Inject new RPT card classes right before .stat-card
const rptClasses = `
    .rpt-card {
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 16px;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.03);
      position: relative;
      overflow: hidden;
    }
    .rpt-card::before {
      content: ''; position: absolute; top:0; left:0; right:0; height: 100%;
      background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
      pointer-events: none;
    }
    .rpt-card:hover { transform: translateY(-4px); }
    
    .rpt-card-red { background: linear-gradient(135deg, #ffffff 0%, #fee2e2 100%); }
    .rpt-card-red:hover { box-shadow: 0 15px 30px -5px rgba(239,68,68,0.2); border-color: #fca5a5; }
    
    .rpt-card-amber { background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%); }
    .rpt-card-amber:hover { box-shadow: 0 15px 30px -5px rgba(245,158,11,0.2); border-color: #fcd34d; }
    
    .rpt-card-blue { background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%); }
    .rpt-card-blue:hover { box-shadow: 0 15px 30px -5px rgba(59,130,246,0.2); border-color: #93c5fd; }
    
    .rpt-card-purple { background: linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%); }
    .rpt-card-purple:hover { box-shadow: 0 15px 30px -5px rgba(168,85,247,0.2); border-color: #d8b4fe; }
    
    .rpt-card-green { background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%); }
    .rpt-card-green:hover { box-shadow: 0 15px 30px -5px rgba(16,185,129,0.2); border-color: #6ee7b7; }
    
    .rpt-card-sky { background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%); }
    .rpt-card-sky:hover { box-shadow: 0 15px 30px -5px rgba(14,165,233,0.2); border-color: #7dd3fc; }

    .stat-card {`;

content = content.replace('.stat-card {', rptClasses);

// 4. Replace inline styles on report cards with new classes using simple replace
const reportCards = [
  { view: "view-machines", cls: "rpt-card rpt-card-red" },
  { view: "view-rpt-due-service", cls: "rpt-card rpt-card-amber" },
  { view: "view-rpt-mwr", cls: "rpt-card rpt-card-amber" },
  { view: "view-defects", cls: "rpt-card rpt-card-red" },
  { view: "view-rpt-sts", cls: "rpt-card rpt-card-blue" },
  { view: "view-reports", cls: "rpt-card rpt-card-purple" },
  { view: "view-rpt-wwu", cls: "rpt-card rpt-card-green" },
  { view: "view-rpt-isr", cls: "rpt-card rpt-card-sky" },
];

reportCards.forEach(rc => {
  const lookFor = '<div onclick="showView(\'' + rc.view + '\')" style="cursor:pointer;background:linear-gradient';
  const startIdx = content.indexOf(lookFor);
  if (startIdx !== -1) {
    const endIdx = content.indexOf('">', startIdx);
    if (endIdx !== -1) {
      const fullStr = content.substring(startIdx, endIdx + 2);
      const replaceWith = '<div onclick="showView(\'' + rc.view + '\')" class="' + rc.cls + '">';
      content = content.replace(fullStr, replaceWith);
    }
  }
});

fs.writeFileSync(path, content, 'utf8');
console.log('Spiced up UI!');
