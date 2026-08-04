const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const dashDefectsOld = `    async function loadFtDefectsDashboard() {
      try {
        const res = await callFrappe(FT_DEFECTS_METHOD, {});
        const rows = Array.isArray(res.message) ? res.message
                   : Array.isArray(res)          ? res : [];
        // Count machines with open defects
        const openDefects = rows.filter(d => (d.status || "").toLowerCase() === "open");
        const uniqueMachines = new Set(openDefects.map(d => d.machine)).size;
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = uniqueMachines;
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = "?";
      }
    }`;

const dashDefectsNew = `    async function loadFtDefectsDashboard() {
      try {
        if (!window.supabase) return;
        const { data: rows, error } = await window.supabase.from('ft_defect').select('machine, status, end_date');
        if (error) throw error;
        
        const currentDiv = window.currentDivision || 'fleetrack';
        const openDefects = (rows || []).filter(d => {
            const statusStr = (d.status || "").toLowerCase();
            const isOpen = statusStr === 'open' || (!d.end_date && statusStr !== 'closed');
            if (!isOpen) return false;
            
            const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[d.machine]) ? (window.MACHINES_MAP[d.machine].division || 'fleetrack') : 'fleetrack';
            return mDiv === currentDiv;
        });
        const uniqueMachines = new Set(openDefects.map(d => d.machine)).size;
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = uniqueMachines;
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = "?";
      }
    }`;
html = html.replace(dashDefectsOld, dashDefectsNew);

const switchOld = `    if (typeof loadFieldServicePlan === 'function') {
        try { loadFieldServicePlan(); } catch(e){}
    }
    if (typeof renderDashboardFsp === 'function') {
        try { renderDashboardFsp(); } catch(e){}
    }
  };`;

const switchNew = `    if (typeof loadFieldServicePlan === 'function') {
        try { loadFieldServicePlan(); } catch(e){}
    }
    if (typeof renderDashboardFsp === 'function') {
        try { renderDashboardFsp(); } catch(e){}
    }
    if (typeof loadFtDefectsDashboard === 'function') {
        try { loadFtDefectsDashboard(); } catch(e){}
    }
  };`;
html = html.replace(switchOld, switchNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed loadFtDefectsDashboard');
