const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Replace addToServicePlan
const addStart = "async function addToServicePlan(machineName) {";
const addEnd = "showToast(\"? Error adding to plan\", \"error\");\n      }\n    }";

const addStartIndex = content.indexOf(addStart);
const addEndIndex = content.indexOf(addEnd) + addEnd.length;

if (addStartIndex !== -1 && addEndIndex !== -1) {
    const newAdd = sync function addToServicePlan(machineName) {
      if (!machineName) return;

      showToast("Adding " + machineName + " to plan...", "info");

      try {
        const machRes = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: { columns: 'customer, region', match: { name: machineName } }
        });
        const machData = machRes.data?.[0] || {};

        const result = await window.electron.invoke('supabase:query', {
          table: 'ft_service_plan',
          method: 'upsert',
          params: { data: { 
              machine_id: machineName, 
              customer: machData.customer || "Unknown",
              region: machData.region || "Unknown",
              description: "Service Due", 
              raw_date: new Date().toISOString().split('T')[0] 
          } }
        });

        if (result && !result.error) {
          showToast("? Added to Service Plan", "ok");
          if (!document.getElementById("view-fsi").classList.contains("hidden")) {
            loadFieldServicePlan();
          }
        } else {
          let errMsg = result.error?.message || "Failed";
          console.error("FSP Add Failed:", result);
          showToast("? " + errMsg, "error");
        }
      } catch (e) {
        console.error(e);
        showToast("? Error adding to plan", "error");
      }
    };
    content = content.substring(0, addStartIndex) + newAdd + content.substring(addEndIndex);
    console.log("Replaced addToServicePlan");
}

// Replace loadFieldServicePlan
const loadStart = "async function loadFieldServicePlan() {";
const loadEnd = "tbody.innerHTML = \<tr><td colspan=\"8\" style=\"text-align:center; color:red;\">Error: \</td></tr>\;\n      }\n    }";

const loadStartIndex = content.indexOf(loadStart);
const loadEndIndex = content.indexOf(loadEnd) + loadEnd.length;

if (loadStartIndex !== -1 && loadEndIndex !== -1) {
    const newLoad = sync function loadFieldServicePlan() {
      const tbody = document.getElementById("tbl-fsi");
      if (!tbody) return;

      tbody.innerHTML = \\\<tr><td colspan="8" style="text-align:center; padding:20px;">Loading plan...</td></tr>\\\;

      try {
        const filters = {};
        const region = document.getElementById("fsp-filter-region")?.value || "";
        const customer = document.getElementById("fsp-filter-customer")?.value || "";
        const machine = document.getElementById("fsp-filter-machine")?.value || "";
        const status = document.getElementById("fsp-filter-status")?.value || "";

        if (region) filters.region = region;
        if (customer) filters.customer = customer;
        if (machine) filters.machine_id = machine;
        if (status) filters.status = status;

        const result = await window.electron.invoke('supabase:query', {
            table: 'ft_service_plan',
            method: 'select',
            params: { columns: '*', match: Object.keys(filters).length ? filters : undefined, range: { from: 0, to: 9999 } }
        });

        if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));

        const rows = result.data || [];

        if (rows.length === 0) {
          tbody.innerHTML = \\\<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No planned jobs found. Connect FSI data or add machines from Register.</td></tr>\\\;
          return;
        }

        tbody.innerHTML = "";
        rows.forEach(r => {
          const tr = document.createElement("tr");
          tr.innerHTML = \\\
                  <td><div style="font-weight:600; color:#1e293b;">\</div></td>
                  <td><div style="font-weight:600; color:#334155;">\</div></td>
                  <td>\</td>
                  <td><span style="font-family:monospace; font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">\</span></td>
                  <td>\</td>
                  <td>
                    <span style="
                      display:inline-block; padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700; text-transform:uppercase;
                      background: \;
                      color: \;
                    ">\</span>
                  </td>
                  <td>\</td>
                  <td style="color:#64748b; font-style:italic;">\</td>
                \\\;
          tbody.appendChild(tr);
        });

      } catch (e) {
        console.error(e);
        tbody.innerHTML = \\\<tr><td colspan="8" style="text-align:center; color:red;">Error: \</td></tr>\\\;
      }
    };
    content = content.substring(0, loadStartIndex) + newLoad + content.substring(loadEndIndex);
    console.log("Replaced loadFieldServicePlan");
} else {
    console.log("Failed to find loadFieldServicePlan bounds");
}

fs.writeFileSync('index.html', content, 'utf8');
