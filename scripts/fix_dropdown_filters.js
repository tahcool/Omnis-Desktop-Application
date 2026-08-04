const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Change dropdown label
html = html.replace('<option value="powerstar">Powerstar (Trucks)</option>', '<option value="powerstar">Sinopower</option>');

// 2. Filter loadFieldServicePlan
const fspOld = `        const rows = rowsResult || [];
        rows.forEach(r => {
           r.name = r.frappe_name || r.id; `;
const fspNew = `        let rows = rowsResult || [];
        const currentDiv = window.currentDivision || 'fleetrack';
        rows = rows.filter(r => {
           const mName = r.machine_name || r.machine;
           const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[mName]) ? (window.MACHINES_MAP[mName].division || 'fleetrack') : 'fleetrack';
           return mDiv === currentDiv;
        });
        rows.forEach(r => {
           r.name = r.frappe_name || r.id; `;
html = html.replace(fspOld, fspNew);

// 3. Filter filterDefectsTable
const defectOld = `      window.FT_DEFECTS_FILTERED_DATA = (FT_DEFECTS_DATA || []).filter(r => {
        // Status is determined by presence of end_date
        const computedStatus = (r.end_date && r.end_date.trim() !== '') ? 'closed' : 'open';`;
const defectNew = `      window.FT_DEFECTS_FILTERED_DATA = (FT_DEFECTS_DATA || []).filter(r => {
        const currentDiv = window.currentDivision || 'fleetrack';
        const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[r.machine]) ? (window.MACHINES_MAP[r.machine].division || 'fleetrack') : 'fleetrack';
        if (mDiv !== currentDiv) return false;
        
        // Status is determined by presence of end_date
        const computedStatus = (r.end_date && r.end_date.trim() !== '') ? 'closed' : 'open';`;
html = html.replace(defectOld, defectNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed dropdown label and filters');
