const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Fix fetchTechnicians filter from 'eq.Active' to 'Active'
html = html.replace(
  "filters: { status: 'eq.Active' }",
  "filters: { status: 'Active' }"
);

// 2. Fix saveNewTechnician payload wrap
html = html.replace(
  "await supaQuery('ft_technicians', 'insert', [payload]);",
  "await supaQuery('ft_technicians', 'insert', { data: payload });"
);

// 3. Fix loadTechniciansView auto-import payload wrap and try...catch blocks
const oldLoadTechView = `    async function loadTechniciansView() { console.log("loadTechniciansView STARTED");
      const tbody = document.getElementById('technicians-table-body');
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Loading...</td></tr>';
      await fetchTechnicians();
      renderTechniciansView();
    }`;

const newLoadTechView = `    async function loadTechniciansView() { console.log("loadTechniciansView STARTED");
      const tbody = document.getElementById('technicians-table-body');
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Loading...</td></tr>';
      
      let techs = await fetchTechnicians();
      if (techs.length === 0) {
        console.log("No technicians found in Supabase! Auto-importing from Frappe...");
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#3b82f6;">Extracting technicians from Frappe Logs... Please wait.</td></tr>';
        try {
          let rawTechs = [];
          
          try {
            const res1 = await callFrappe('/api/resource/FT Breakdown Log?fields=["technician_name"]&limit_page_length=5000', {});
            const recs1 = res1?.message?.data || res1?.data || res1?.message || [];
            if(Array.isArray(recs1)) rawTechs.push(...recs1.map(d => d.technician_name));
          } catch(e) { console.warn("Failed to get from FT Breakdown Log", e); }
          
          try {
            const res2 = await callFrappe('/api/resource/FT Service Log?fields=["technician_name"]&limit_page_length=5000', {});
            const recs2 = res2?.message?.data || res2?.data || res2?.message || [];
            if(Array.isArray(recs2)) {
               console.log("Sample FT Service Log record:", recs2[0]);
               rawTechs.push(...recs2.map(d => d.technician_name));
            }
          } catch(e) { console.warn("Failed to get from FT Service Log", e); }
          
          let uniqueTechs = [...new Set(rawTechs)].filter(t => t && t.trim() !== '' && t !== 'Unassigned');
          
          for (const t of uniqueTechs) {
            const payload = {
              frappe_name: t,
              full_name: t,
              status: 'Active'
            };
            await supaQuery('ft_technicians', 'insert', { data: payload });
          }
          console.log("Import complete. Re-fetching from Supabase.");
          FT_TECH_CACHE.data = null;
          FT_TECH_CACHE.ts = 0;
          await fetchTechnicians();
        } catch (err) {
          console.error("Auto-import failed:", err);
        }
      }
      
      renderTechniciansView();
    }`;

html = html.replace(oldLoadTechView, newLoadTechView);

// Write back
fs.writeFileSync('systems/fleetrack/index.html', html, 'utf8');
console.log("Patched index.html with all fixes!");
