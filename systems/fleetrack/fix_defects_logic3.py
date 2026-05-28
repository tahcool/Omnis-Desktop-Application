import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update loadFtDefectsDashboard
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
c = re.sub(r'async function loadFtDefectsDashboard\(\) \{.*?updateDefectFilterSummary\(\);\s*renderDefectTable\(\);\s*\} catch \(e\) \{.*?\}\s*\}', new_kpi_logic.strip(), c, count=1, flags=re.DOTALL)

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
c = re.sub(r'async function loadFtDefects\(\) \{.*?renderDefectsTable\(FT_DEFECTS_DATA\);\s*\} catch \(e\) \{.*?\}\s*\}', new_list_logic.strip(), c, count=1, flags=re.DOTALL)

# 3. Update saveDefect
new_save_logic = """
    async function saveDefect() {
      const mode = document.getElementById("modal-defect").dataset.mode || "new";
      const id = document.getElementById("def-id").value;
      
      const payload = {
        machine: document.getElementById("def-machine").value,
        component: document.getElementById("def-component").value,
        defect_type: document.getElementById("def-type").value,
        description: document.getElementById("def-desc").value,
        priority: document.getElementById("def-priority").value,
        status: document.getElementById("def-status").value,
        reported_by: document.getElementById("def-reporter").value,
      };

      try {
        let raw;
        if (mode === "edit" && id) {
          raw = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'update',
            params: {
              data: payload,
              match: { id: id }
            }
          });
        } else {
          raw = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'insert',
            params: {
              data: payload
            }
          });
        }
        
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        showToast("Defect saved successfully!", "success");
        closeDefectModal();
        loadFtDefects();
        loadFtDefectsDashboard();
      } catch (e) {
        console.error("Save Defect Error:", e);
        showToast("Failed to save defect: " + e.message, "err");
      }
    }
"""
c = re.sub(r'async function saveDefect\(\) \{.*?loadFtDefects\(\);\s*loadFtDefectsDashboard\(\);\s*\} catch \(e\) \{.*?\}\s*\}', new_save_logic.strip(), c, count=1, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Applied defects logic correctly!")
