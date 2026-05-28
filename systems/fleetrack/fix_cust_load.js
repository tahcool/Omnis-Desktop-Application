const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

const oldStr = `window.loadCustomersView = async function() {\r\n    const tbody = document.getElementById("cust-tbody");\r\n    if (!tbody) return;\r\n    tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#64748b;">⏳ Loading customers…</td></tr>';\r\n    try {\r\n      const res = await callFrappe(\r\n        "/api/method/mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.get_ft_customers", {}\r\n      );\r\n      CUST_ALL_DATA = res?.message?.customers || res?.customers || [];\r\n      filterCustomers();\r\n    } catch(e) {\r\n      tbody.innerHTML = '<tr><td colspan="7" style="padding:20px;color:#dc2626;">Error: ' + e.message + '</td></tr>';\r\n    }\r\n  };`;

const newStr = `window.loadCustomersView = async function() {
    const tbody = document.getElementById("cust-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#64748b;">⏳ Loading customers…</td></tr>';
    try {
      // Derive customers from the already-loaded machine register (no new API needed)
      let machines = window.FT_MACHINE_ROWS || [];
      if (!machines.length) {
        const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}
        );
        machines = res?.message?.rows || res?.rows || [];
        window.FT_MACHINE_ROWS = machines;
      }
      // Aggregate unique customers from machine list
      const custMap = {};
      machines.forEach(m => {
        const key = (m.customer || "").trim();
        if (!key) return;
        if (!custMap[key]) {
          custMap[key] = { name: key, customer_name: key, region: m.region || "",
            machine_count: 0, contact_person: "", phone: "", email: "", whatsapp_group_id: "" };
        }
        custMap[key].machine_count++;
        if (!custMap[key].region && m.region) custMap[key].region = m.region;
      });
      CUST_ALL_DATA = Object.values(custMap).sort((a,b) => a.customer_name.localeCompare(b.customer_name));
      filterCustomers();
    } catch(e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:20px;color:#dc2626;">Error: ' + e.message + '</td></tr>';
    }
  };`;

console.log('Found:', c.includes(oldStr));
const out = c.replace(oldStr, newStr);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', out, 'utf8');
console.log('Done');
