const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8').split('\n');
lines.forEach((l,i) => {
  if (/view-customers|view-service|ft.customer|service.due|service.track|FT.Customer|customer_name.*phone|whatsapp_group/i.test(l)) {
    console.log((i+1)+':', l.trim().substring(0,130));
  }
});
