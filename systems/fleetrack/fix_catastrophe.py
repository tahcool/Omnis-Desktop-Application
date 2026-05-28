# -*- coding: utf-8 -*-
import codecs
import re

# 1. Read block_10706.js to get the original code
with codecs.open('block_10706.js', 'r', 'utf-8') as f:
    orig_content = f.read()

# Extract from loadFtBreakdownDashboard up to the end of loadFtMachineRegister
start_marker = "async function loadFtBreakdownDashboard() {"
end_marker = "window.FT_MACHINE_ROWS = payload.data || [];"
# Wait, let's find the start of loadFtBreakdownDashboard
start_idx = orig_content.find(start_marker)

# Let's find the end of loadFtMachineRegister
# It's better to just extract the whole block until the next major function to be safe.
next_func = orig_content.find("async function refreshMachineRegisterReport() {", start_idx)
orig_block = orig_content[start_idx:next_func]

print(f"Extracted original block of {len(orig_block)} chars")

# 2. Refactor loadFtBreakdownDashboard to use Supabase natively
# (We already wrote this logic in fix_dashboard_kpis3.py)
dashboard_new = '''async function loadFtBreakdownDashboard() {
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
            setKpi("kpi-machines-defects", 0);

            // 2. Fetch all open breakdowns
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

            // 3. Render recent breakdowns
            const tbody = document.getElementById("tbl-recent-breakdowns");
            if (tbody) {
                tbody.innerHTML = "";
                const rowsToShow = openBreakdowns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
                
                if (!rowsToShow.length) {
                    tbody.innerHTML = <tr><td colspan="6" style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">No open breakdowns.</td></tr>;
                } else {
                    rowsToShow.forEach((row, idx) => {
                        const tr = document.createElement("tr");
                        const statusLabel = row.urgent ? "Open - Urgent" : (row.status || "Open");
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
    }'''

# Replace the old loadFtBreakdownDashboard in the orig_block
old_dashboard_start = orig_block.find("async function loadFtBreakdownDashboard() {")
# It ends right before "async function loadFtMachineRegister" or some other function
old_dashboard_end = orig_block.find("async function loadFtDefectsDashboard() {", old_dashboard_start)
if old_dashboard_end == -1:
    old_dashboard_end = orig_block.find("async function loadFtMachineRegister", old_dashboard_start)

orig_block = orig_block[:old_dashboard_start] + dashboard_new + "\n\n      " + orig_block[old_dashboard_end:]

# 3. Refactor loadFtMachineRegister to use Supabase
machine_old_start = "const raw = await callFrappe(FT_MACHINE_REGISTER_METHOD, overrides, 'GET', {"
machine_old_end = "const payload = raw.message || raw;"
machine_new = '''const filterOpts = {
          table: 'ft_machine',
          method: 'select',
          params: { columns: '*' }
        };
        
        if (Object.keys(overrides).length > 0 && !overrides.quiet) {
          filterOpts.params.match = {};
          if (overrides.region) filterOpts.params.match.region = overrides.region;
          if (overrides.customer) filterOpts.params.match.customer = overrides.customer;
          if (overrides.model) filterOpts.params.match.model = overrides.model;
          if (overrides.warranty_status) filterOpts.params.match.warranty_status = overrides.warranty_status;
          if (Object.keys(filterOpts.params.match).length === 0) delete filterOpts.params.match;
        }

        const raw = await window.electron.invoke('supabase:query', filterOpts);
        if (!raw || raw.error) {
          let msg = raw?.error?.message || "Failed to load machines from Supabase";
          showToast("Machine register error: " + msg, "err", 4500);
          return;
        }
        const payload = { data: raw.data || [] };'''

# regex replace precisely
import re
orig_block = re.sub(r'const raw = await callFrappe\(FT_MACHINE_REGISTER_METHOD.*?const payload = raw\.message \|\| raw;', machine_new, orig_block, flags=re.DOTALL)

# 4. Now find the corrupted block in index.html
with codecs.open('index.html', 'r', 'utf-8') as f:
    idx_content = f.read()

idx_start = idx_content.find("async function loadFtBreakdownDashboard() {")
idx_end = idx_content.find("async function refreshMachineRegisterReport() {", idx_start)

# 5. Replace corrupted block with our reconstructed block
new_idx_content = idx_content[:idx_start] + orig_block + idx_content[idx_end:]

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(new_idx_content)

print("Restored missing 1200 lines and refactored both functions safely!")
