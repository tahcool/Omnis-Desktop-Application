const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

const old = `filterCustomers = function() {\r\n    const q = (document.getElementById("cust-search")?.value || "").toLowerCase();\r\n    const rows = q ? CUST_ALL_DATA.filter(c => {\r\n      const hay = [c.customer_name, c.contact_person, c.phone, c.region].map(s => (s||"").toLowerCase()).join(" ");\r\n      return hay.includes(q);\r\n    }) : CUST_ALL_DATA;\r\n    renderCustomersTable(rows);\r\n  };`;

const nw = `filterCustomers = function() {
    const q = (document.getElementById("cust-search")?.value || "").toLowerCase();
    const regionF = (document.getElementById("cust-filter-region")?.value || "").toLowerCase();
    const rows = CUST_ALL_DATA.filter(c => {
      if (regionF && (c.region||"").toLowerCase() !== regionF) return false;
      if (!q) return true;
      const hay = [c.customer_name, c.contact_person, c.phone, c.region].map(s => (s||"").toLowerCase()).join(" ");
      return hay.includes(q);
    });
    renderCustomersTable(rows);
  };`;

console.log('Found:', c.includes(old));
c = c.replace(old, nw);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done');
