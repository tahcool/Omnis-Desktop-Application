const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');

// 1. Find the Reports nav / menu buttons
const rptNav = c.indexOf('Reports');
const rptLine = c.substring(0,rptNav).split('\n').length;
console.log('First "Reports" at line ~'+rptLine);

// 2. Find what fields machines have (last_service, service_date, etc.)
['last_service','service_date','last_service_date','next_service','next_service_hmr','current_hmr'].forEach(f=>{
  const idx = c.indexOf(f);
  if(idx>=0) console.log(f+': line ~'+c.substring(0,idx).split('\n').length);
  else console.log(f+': NOT FOUND');
});

// 3. Find Machine Register view and Reports view IDs
['view-reports','view-machines','view-frappe-report','view-isr','report-nav','reports-menu','btn-print-dbr','btn-machine-register-print'].forEach(id=>{
  const idx = c.indexOf(id);
  if(idx>=0) console.log('"'+id+'": line ~'+c.substring(0,idx).split('\n').length);
  else console.log('"'+id+'": NOT FOUND');
});

// 4. Find where the Reports section nav/tabs are (look for DBR and Machine Register buttons together)
const dbrBtn = c.indexOf('btn-print-dbr');
lines.slice(Math.max(0,c.substring(0,dbrBtn).split('\n').length-50), c.substring(0,dbrBtn).split('\n').length+5)
  .forEach((l,i)=>{ if(l.includes('btn-') || l.includes('onclick') || l.includes('Report') || l.includes('Machine')) console.log((c.substring(0,dbrBtn).split('\n').length-50+i)+': '+l.substring(0,100)); });
