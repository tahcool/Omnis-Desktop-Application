import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

# Insert loadFtBreakdownDashboard before the end of the main script tag
# The easiest way is to find the function call "loadFtBreakdownDashboard();" and put the definition right after it!
# But it's inside checkLoginAndInit() or similar maybe?
# Let's just find the string "loadFtBreakdownDashboard();" and replace it with:
# loadFtBreakdownDashboard();
# async function loadFtBreakdownDashboard() { ... }

dashboard_code = '''loadFtBreakdownDashboard();

    async function loadFtBreakdownDashboard() {
        try {
            const setKpi = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value != null ? value : "-";
            };

            // 1. Fetch all machines for active count
            const machinesRes = await window.electron.invoke('supabase:query', {
                table: 'ft_machine',
                method: 'select',
                params: { columns: 'name' }
            });
            const activeMachines = machinesRes.data ? machinesRes.data.length : 0;
            setKpi("kpi-active-machines", activeMachines);
            setKpi("kpi-machines-defects", 0); // Placeholder until defects are migrated

            // 2. Fetch all open breakdowns
            const breakdownsRes = await window.electron.invoke('supabase:query', {
                table: 'ft_breakdown_log',
                method: 'select',
                params: { columns: '*', match: { end_date: null } }
            });
            
            const openBreakdowns = breakdownsRes.data || [];
            const urgentBreakdowns = openBreakdowns.filter(b => b.urgent == 1).length;
            
            setKpi("kpi-open-breakdowns", openBreakdowns.length);
            setKpi("kpi-urgent-breakdowns", urgentBreakdowns);

            // 3. Render recent breakdowns
            const tbody = document.getElementById("tbl-recent-breakdowns");
            if (tbody) {
                tbody.innerHTML = "";
                // Show top 10 most recent
                const rowsToShow = openBreakdowns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
                
                if (!rowsToShow.length) {
                    tbody.innerHTML = <tr><td colspan="6" style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">No open breakdowns.</td></tr>;
                } else {
                    rowsToShow.forEach((row, idx) => {
                        const tr = document.createElement("tr");
                        const statusLabel = row.urgent ? "Open — Urgent" : (row.status || "Open");
                        if (row.urgent) tr.classList.add("bd-row-urgent");
                        else tr.classList.add("bd-row-open");
                        
                        tr.innerHTML = 
                            <td></td>
                            <td><div style="font-weight:600;"></div><div style="font-size:10px;color:var(--text-muted);"></div></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><button class="btn btn-secondary btn-sm" onclick="showToast('View not wired yet', 'info')">View</button></td>
                        ;
                        tbody.appendChild(tr);
                    });
                }
            }
        } catch (err) {
            console.error("Dashboard load failed:", err);
        }
    }
'''

if "async function loadFtBreakdownDashboard()" not in content:
    content = content.replace("loadFtBreakdownDashboard();", dashboard_code)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

print("Injected native loadFtBreakdownDashboard into index.html")
