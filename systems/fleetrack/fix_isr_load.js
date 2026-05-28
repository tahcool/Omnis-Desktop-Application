const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const loadISRStart = "window.loadISR = async function() {";
const loadISREnd = "console.error('[ISR] load error:', e);\n      }\n    }";

const startIndex = content.indexOf(loadISRStart);
const endIndex = content.indexOf(loadISREnd) + loadISREnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newLoad = "window.loadISR = async function() {\n" +
"      const region = document.getElementById('isr-filter-region')?.value || '';\n" +
"      const container = document.getElementById('isr-table-container');\n" +
"      const kpi = document.getElementById('isr-kpi-badge');\n" +
"      if (!container) return;\n" +
"      container.innerHTML = '<div style=\"text-align:center;padding:40px;color:var(--text-muted);font-size:13px;\">? Loading ISR data...</div>';\n" +
"      try {\n" +
"        const params = { range: { from: 0, to: 9999 } };\n" +
"        if (region) params.match = { region: region };\n" +
"        const raw = await window.electron.invoke('supabase:query', {\n" +
"            table: 'ft_machine',\n" +
"            method: 'select',\n" +
"            params: params\n" +
"        });\n" +
"        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));\n" +
"        const allMachines = raw.data || [];\n" +
"        ISR_ROWS = allMachines.filter(m => !m.last_service_date);\n" +
"        if (kpi) {\n" +
"          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' — No Service Date';\n" +
"          kpi.style.display = 'block';\n" +
"        }\n" +
"        renderISRTable(ISR_ROWS);\n" +
"      } catch(e) {\n" +
"        container.innerHTML = '<div style=\"text-align:center;padding:40px;color:#ef4444;font-size:13px;\">? Error loading ISR: ' + e.message + '</div>';\n" +
"        console.error('[ISR] load error:', e);\n" +
"      }\n" +
"    }";
    content = content.substring(0, startIndex) + newLoad + content.substring(endIndex);
    console.log("Replaced loadISR");
}

fs.writeFileSync('index.html', content, 'utf8');
