const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    find: `.rpt-card-red { background: linear-gradient(135deg, #ffffff 0%, #fee2e2 100%); }`,
    replace: `.rpt-card-red { background: linear-gradient(135deg, #ffffff 0%, #fee2e2 100%); box-shadow: 0 12px 24px -4px rgba(239,68,68,0.2); border-color: #fca5a5; }`
  },
  {
    find: `.rpt-card-red:hover { box-shadow: 0 15px 30px -5px rgba(239,68,68,0.2); border-color: #fca5a5; }`,
    replace: `.rpt-card-red:hover { box-shadow: 0 20px 40px -5px rgba(239,68,68,0.4); border-color: #ef4444; }`
  },
  {
    find: `.rpt-card-amber { background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%); }`,
    replace: `.rpt-card-amber { background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%); box-shadow: 0 12px 24px -4px rgba(245,158,11,0.2); border-color: #fcd34d; }`
  },
  {
    find: `.rpt-card-amber:hover { box-shadow: 0 15px 30px -5px rgba(245,158,11,0.2); border-color: #fcd34d; }`,
    replace: `.rpt-card-amber:hover { box-shadow: 0 20px 40px -5px rgba(245,158,11,0.4); border-color: #f59e0b; }`
  },
  {
    find: `.rpt-card-blue { background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%); }`,
    replace: `.rpt-card-blue { background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%); box-shadow: 0 12px 24px -4px rgba(59,130,246,0.2); border-color: #93c5fd; }`
  },
  {
    find: `.rpt-card-blue:hover { box-shadow: 0 15px 30px -5px rgba(59,130,246,0.2); border-color: #93c5fd; }`,
    replace: `.rpt-card-blue:hover { box-shadow: 0 20px 40px -5px rgba(59,130,246,0.4); border-color: #3b82f6; }`
  },
  {
    find: `.rpt-card-purple { background: linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%); }`,
    replace: `.rpt-card-purple { background: linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%); box-shadow: 0 12px 24px -4px rgba(168,85,247,0.2); border-color: #d8b4fe; }`
  },
  {
    find: `.rpt-card-purple:hover { box-shadow: 0 15px 30px -5px rgba(168,85,247,0.2); border-color: #d8b4fe; }`,
    replace: `.rpt-card-purple:hover { box-shadow: 0 20px 40px -5px rgba(168,85,247,0.4); border-color: #a855f7; }`
  },
  {
    find: `.rpt-card-green { background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%); }`,
    replace: `.rpt-card-green { background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%); box-shadow: 0 12px 24px -4px rgba(16,185,129,0.2); border-color: #6ee7b7; }`
  },
  {
    find: `.rpt-card-green:hover { box-shadow: 0 15px 30px -5px rgba(16,185,129,0.2); border-color: #6ee7b7; }`,
    replace: `.rpt-card-green:hover { box-shadow: 0 20px 40px -5px rgba(16,185,129,0.4); border-color: #10b981; }`
  },
  {
    find: `.rpt-card-sky { background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%); }`,
    replace: `.rpt-card-sky { background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%); box-shadow: 0 12px 24px -4px rgba(14,165,233,0.2); border-color: #7dd3fc; }`
  },
  {
    find: `.rpt-card-sky:hover { box-shadow: 0 15px 30px -5px rgba(14,165,233,0.2); border-color: #7dd3fc; }`,
    replace: `.rpt-card-sky:hover { box-shadow: 0 20px 40px -5px rgba(14,165,233,0.4); border-color: #0ea5e9; }`
  },
  {
    find: `.rpt-card:hover { transform: translateY(-4px); }`,
    replace: `.rpt-card:hover { transform: translateY(-6px); }`
  }
];

let changedCount = 0;
replacements.forEach(r => {
  if (content.includes(r.find)) {
    content = content.replace(r.find, r.replace);
    changedCount++;
  } else {
    console.log("Could not find:", r.find);
  }
});

fs.writeFileSync(path, content, 'utf8');
console.log('Made replacements:', changedCount);
