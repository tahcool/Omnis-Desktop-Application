const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Replace addToServicePlan
const addStart = "async function addToServicePlan(machineName) {";
const addEnd = "showToast(\"? Error adding to plan\", \"error\");\n      }\n    }";

const addStartIndex = content.indexOf(addStart);
const addEndIndex = content.indexOf(addEnd) + addEnd.length;

if (addStartIndex !== -1 && addEndIndex !== -1) {
    const newAdd = "async function addToServicePlan(machineName) {\n" +
"      if (!machineName) return;\n" +
"\n" +
"      showToast(\"Adding \" + machineName + \" to plan...\", \"info\");\n" +
"\n" +
"      try {\n" +
"        const machRes = await window.electron.invoke('supabase:query', {\n" +
"            table: 'ft_machine',\n" +
"            method: 'select',\n" +
"            params: { columns: 'customer, region', match: { name: machineName } }\n" +
"        });\n" +
"        const machData = machRes.data?.[0] || {};\n" +
"\n" +
"        const result = await window.electron.invoke('supabase:query', {\n" +
"          table: 'ft_service_plan',\n" +
"          method: 'upsert',\n" +
"          params: { data: { \n" +
"              machine_id: machineName, \n" +
"              customer: machData.customer || \"Unknown\",\n" +
"              region: machData.region || \"Unknown\",\n" +
"              description: \"Service Due\", \n" +
"              raw_date: new Date().toISOString().split('T')[0] \n" +
"          } }\n" +
"        });\n" +
"\n" +
"        if (result && !result.error) {\n" +
"          showToast(\"? Added to Service Plan\", \"ok\");\n" +
"          if (!document.getElementById(\"view-fsi\").classList.contains(\"hidden\")) {\n" +
"            loadFieldServicePlan();\n" +
"          }\n" +
"        } else {\n" +
"          let errMsg = result.error?.message || \"Failed\";\n" +
"          console.error(\"FSP Add Failed:\", result);\n" +
"          showToast(\"? \" + errMsg, \"error\");\n" +
"        }\n" +
"      } catch (e) {\n" +
"        console.error(e);\n" +
"        showToast(\"? Error adding to plan\", \"error\");\n" +
"      }\n" +
"    }";
    content = content.substring(0, addStartIndex) + newAdd + content.substring(addEndIndex);
    console.log("Replaced addToServicePlan");
}

// Replace loadFieldServicePlan
const loadStart = "async function loadFieldServicePlan() {";
const loadEnd = "tbody.innerHTML = <tr><td colspan=\"8\" style=\"text-align:center; color:red;\">Error: </td></tr>;\n      }\n    }";

const loadStartIndex = content.indexOf(loadStart);
const loadEndIndex = content.indexOf(loadEnd) + loadEnd.length;

if (loadStartIndex !== -1 && loadEndIndex !== -1) {
    const newLoad = "async function loadFieldServicePlan() {\n" +
"      const tbody = document.getElementById(\"tbl-fsi\");\n" +
"      if (!tbody) return;\n" +
"\n" +
"      tbody.innerHTML = <tr><td colspan=\"8\" style=\"text-align:center; padding:20px;\">Loading plan...</td></tr>;\n" +
"\n" +
"      try {\n" +
"        const filters = {};\n" +
"        const region = document.getElementById(\"fsp-filter-region\")?.value || \"\";\n" +
"        const customer = document.getElementById(\"fsp-filter-customer\")?.value || \"\";\n" +
"        const machine = document.getElementById(\"fsp-filter-machine\")?.value || \"\";\n" +
"        const status = document.getElementById(\"fsp-filter-status\")?.value || \"\";\n" +
"\n" +
"        if (region) filters.region = region;\n" +
"        if (customer) filters.customer = customer;\n" +
"        if (machine) filters.machine_id = machine;\n" +
"        if (status) filters.status = status;\n" +
"\n" +
"        const result = await window.electron.invoke('supabase:query', {\n" +
"            table: 'ft_service_plan',\n" +
"            method: 'select',\n" +
"            params: { columns: '*', match: Object.keys(filters).length ? filters : undefined, range: { from: 0, to: 9999 } }\n" +
"        });\n" +
"\n" +
"        if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));\n" +
"\n" +
"        const rows = result.data || [];\n" +
"\n" +
"        if (rows.length === 0) {\n" +
"          tbody.innerHTML = <tr><td colspan=\"8\" style=\"text-align:center; padding:20px; color:#64748b;\">No planned jobs found. Connect FSI data or add machines from Register.</td></tr>;\n" +
"          return;\n" +
"        }\n" +
"\n" +
"        tbody.innerHTML = \"\";\n" +
"        rows.forEach(r => {\n" +
"          const tr = document.createElement(\"tr\");\n" +
"          tr.innerHTML = \n" +
"                  <td><div style=\"font-weight:600; color:#1e293b;\"></div></td>\n" +
"                  <td><div style=\"font-weight:600; color:#334155;\"></div></td>\n" +
"                  <td></td>\n" +
"                  <td><span style=\"font-family:monospace; font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;\"></span></td>\n" +
"                  <td></td>\n" +
"                  <td>\n" +
"                    <span style=\"\n" +
"                      display:inline-block; padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700; text-transform:uppercase;\n" +
"                      background: ;\n" +
"                      color: ;\n" +
"                    \"></span>\n" +
"                  </td>\n" +
"                  <td></td>\n" +
"                  <td style=\"color:#64748b; font-style:italic;\"></td>\n" +
"                ;\n" +
"          tbody.appendChild(tr);\n" +
"        });\n" +
"\n" +
"      } catch (e) {\n" +
"        console.error(e);\n" +
"        tbody.innerHTML = <tr><td colspan=\"8\" style=\"text-align:center; color:red;\">Error: </td></tr>;\n" +
"      }\n" +
"    }";
    content = content.substring(0, loadStartIndex) + newLoad + content.substring(loadEndIndex);
    console.log("Replaced loadFieldServicePlan");
} else {
    console.log("Failed to find loadFieldServicePlan bounds");
}

fs.writeFileSync('index.html', content, 'utf8');
