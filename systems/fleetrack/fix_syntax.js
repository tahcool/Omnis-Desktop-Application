const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// The problematic string with no quotes:
const badStr1 = 'tbody.innerHTML = <tr><td colspan="6" style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">No open breakdowns.</td></tr>;';
const badStr2 = 'tr.innerHTML = \\n                            <td></td>';
const badStr3 = '<td><button class="btn btn-secondary btn-sm" onclick="showToast(\\\'View not wired yet\\\', \\\'info\\\')">View</button></td>\\n                        ;';

// Let's just do a regex replace for the entire loadFtBreakdownDashboard function
// and replace it with a properly backticked version.

// Wait, I can just find the start and end of loadFtBreakdownDashboard and replace the body.

const targetStart = "async function loadFtBreakdownDashboard() {";
const targetEnd = "console.error(\"Dashboard load failed:\", err);\n        }\n    }";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd) + targetEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const dashboard_code = \sync function loadFtBreakdownDashboard() {
        try {
            const setKpi = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value != null ? value : "-";
            };

            const machinesRes = await window.electron.invoke('supabase:query', {
                table: 'ft_machine',
                method: 'select',
                params: { columns: 'name' }
            });
            const activeMachines = machinesRes.data ? machinesRes.data.length : 0;
            setKpi("kpi-active-machines", activeMachines);
            setKpi("kpi-machines-defects", 0);

            const breakdownsRes = await window.electron.invoke('supabase:query', {
                table: 'ft_breakdown_log',
                method: 'select',
                params: { columns: '*', match: { end_date: null } }
            });
            
            const openBreakdowns = breakdownsRes.data || [];
            window.FT_BREAKDOWN_ROWS_OPEN = openBreakdowns;
            const urgentBreakdowns = openBreakdowns.filter(b => b.urgent == 1).length;
            
            setKpi("kpi-open-breakdowns", openBreakdowns.length);
            setKpi("kpi-urgent-breakdowns", urgentBreakdowns);

            const tbody = document.getElementById("tbl-recent-breakdowns");
            if (tbody) {
                tbody.innerHTML = "";
                const rowsToShow = openBreakdowns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
                
                if (!rowsToShow.length) {
                    tbody.innerHTML = \\\<tr><td colspan="6" style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">No open breakdowns.</td></tr>\\\;
                } else {
                    rowsToShow.forEach((row, idx) => {
                        const tr = document.createElement("tr");
                        const statusLabel = row.urgent ? "Open - Urgent" : (row.status || "Open");
                        if (row.urgent) tr.classList.add("bd-row-urgent");
                        else tr.classList.add("bd-row-open");
                        
                        tr.innerHTML = \\\
                            <td>\</td>
                            <td><div style="font-weight:600;">\</div><div style="font-size:10px;color:var(--text-muted);">\</div></td>
                            <td>\</td>
                            <td>\</td>
                            <td>\</td>
                            <td><button class="btn btn-secondary btn-sm" onclick="showToast('View not wired yet', 'info')">View</button></td>
                        \\\;
                        tbody.appendChild(tr);
                    });
                }
            }
        } catch (err) {
            console.error("Dashboard load failed:", err);
        }
    }\;

    content = content.substring(0, startIndex) + dashboard_code + content.substring(endIndex);
    fs.writeFileSync('index.html', content, 'utf8');
    console.log("Fixed syntax error in loadFtBreakdownDashboard");
} else {
    console.log("Could not find function bounds.");
}

