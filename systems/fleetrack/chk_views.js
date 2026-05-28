const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
lines.forEach((l,i) => {
  if (/VIEW_MAP|viewMap|view-pages|view-page|showView|switchView|navItem.*click|data-view.*click|classList.*hidden.*view|view-dashboard.*el/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,120));
  }
});
