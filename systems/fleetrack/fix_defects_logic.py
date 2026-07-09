import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update loadFtDefectsDashboard
# Old implementation fetched from Frappe
new_kpi_logic = """
    async function loadFtDefectsDashboard() {
      try {
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'select',
            params: {
                columns: 'machine',
                match: { status: 'Open' }
            }
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        
        const openDefects = raw.data || [];
        const uniqueMachines = new Set(openDefects.map(d => d.machine)).size;
        setKpi("kpi-machines-defects", uniqueMachines);
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
        setKpi("kpi-machines-defects", "?");
      }
    }
"""

c = re.sub(r'async function loadFtDefectsDashboard\(\) \{[\s\S]*?\} catch \(e\) \{[\s\S]*?\}[\s\S]*?\}', new_kpi_logic.strip(), c, count=1)

# 2. Update loadFtDefects
new_list_logic = """
    async function loadFtDefects() {
      try {
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'select',
            params: {
                order: { column: 'created_at', options: { ascending: false } }
            }
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));

        const data = raw.data || [];
        FT_DEFECTS_DATA = data;
        renderDefectsTable(FT_DEFECTS_DATA);
      } catch (e) {
        console.error("Load Defects Error:", e);
        showToast("Failed to load defects", "err");
      }
    }
"""

c = re.sub(r'async function loadFtDefects\(\) \{[\s\S]*?renderDefectsTable\(FT_DEFECTS_DATA\);[\s\S]*?\} catch \(e\) \{[\s\S]*?\}[\s\S]*?\}', new_list_logic.strip(), c, count=1)

# 3. Update saveDefect logic
# In modal_search.txt, the save logic was inside a function, let's find it. It's likely sync function submitDefectModal or something?
# Actually, the button has onclick="saveDefect()". No wait, let's look for const id = document.getElementById("defect-id").value;
new_save_logic = """
      showToast("Saving...", "info", 1000);
      try {
        let res;
        if (id) {
          // UPDATE via Supabase
          res = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'update',
            data: { status, priority, description, defect_type },
            match: { name: id }
          });
        } else {
          // CREATE via Supabase
          res = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'insert',
            data: { machine, defect_type, priority, description, status: 'Open' }
          });
        }

        if (res.error) throw new Error(res.error.message || JSON.stringify(res.error));

        showToast("Defect Saved!", "success");
        closeDefectModal();
        loadFtDefects();
        loadFtDefectsDashboard(); // Update KPI as well
      } catch (e) {
        console.error(e);
        showToast("Error: " + e.message, "err");
      }
"""

c = re.sub(r'showToast\("Saving...", "info", 1000\);[\s\S]*?try \{[\s\S]*?let res;[\s\S]*?if \(id\) \{[\s\S]*?\} else \{[\s\S]*?\}[\s\S]*?if \(res.error\) throw new Error\(res.error\);[\s\S]*?showToast\("Defect Saved!", "success"\);[\s\S]*?closeDefectModal\(\);[\s\S]*?loadFtDefects\(\);[\s\S]*?\} catch \(e\) \{[\s\S]*?console.error\(e\);[\s\S]*?showToast\("Error: " \+ e.message, "err"\);[\s\S]*?\}', new_save_logic.strip(), c, count=1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated index.html logic for defects!")
