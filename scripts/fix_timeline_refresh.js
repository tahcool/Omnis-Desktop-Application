const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// Filter renderDashboardFsp
const dashOld = `      const rows = window._fspRows || [];
      const today = new Date();`;
const dashNew = `      let rows = window._fspRows || [];
      const currentDiv = window.currentDivision || 'fleetrack';
      rows = rows.filter(r => {
        const mName = r.machine || r.machine_name;
        const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[mName]) ? (window.MACHINES_MAP[mName].division || 'fleetrack') : 'fleetrack';
        return mDiv === currentDiv;
      });
      const today = new Date();`;
html = html.replace(dashOld, dashNew);

// Add renderDashboardFsp() to switchDivision
const switchOld = `    if (typeof loadFieldServicePlan === 'function') {
        try { loadFieldServicePlan(); } catch(e){}
    }
  };`;
const switchNew = `    if (typeof loadFieldServicePlan === 'function') {
        try { loadFieldServicePlan(); } catch(e){}
    }
    if (typeof renderDashboardFsp === 'function') {
        try { renderDashboardFsp(); } catch(e){}
    }
  };`;
html = html.replace(switchOld, switchNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed timeline refresh');
