const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Update HTML filter bar
const filterTarget = `          <div class="rpt-filter-group">
            <label>Model</label>
            <input type="text" id="sts-model" placeholder="Filter by model…" oninput="filterStsTable()">
          </div>`;
          
const filterReplacement = `          <div class="rpt-filter-group">
            <label>Model</label>
            <input type="text" id="sts-model" placeholder="Filter by model…" oninput="filterStsTable()">
          </div>
          <div class="rpt-filter-group" style="flex:1;">
            <label>Machine / SN</label>
            <input type="text" id="sts-machine-search" placeholder="Search Machine or SN…" oninput="filterStsTable()">
          </div>
          <div class="rpt-filter-group" style="flex:0 0 auto;">
            <label>Status</label>
            <select id="sts-status" onchange="filterStsTable()">
              <option value="">All Statuses</option>
              <option value="overdue">Overdue / Stale</option>
              <option value="approaching">Approaching</option>
              <option value="ontrack">On Track</option>
            </select>
          </div>`;

if (html.includes(filterTarget)) {
    html = html.replace(filterTarget, filterReplacement);
} else {
    console.log("Failed to find filter HTML block!");
}

// 2. Update filterStsTable function
const filterFuncTarget = `      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');
      
      const filtered = _stsAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))
        );
      });`;

const filterFuncReplacement = `      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');
      const machineSearch = (document.getElementById('sts-machine-search')?.value || '').toLowerCase();
      
      const filtered = _stsAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        const mStr = ((m.name||'') + ' ' + (m.sn||'')).toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model)) &&
          (!machineSearch || mStr.includes(machineSearch))
        );
      });`;

if (html.includes(filterFuncTarget)) {
    html = html.replace(filterFuncTarget, filterFuncReplacement);
} else {
    console.log("Failed to find filter logic block!");
}

// 3. Update renderStsTable to filter by status
const renderTarget = `        return { 
          m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, estimatedHmr, isOverdue, isApproaching
        };
      });

      document.getElementById('sts-overdue').textContent = overdueCount;
      document.getElementById('sts-approaching').textContent = approachingCount;

      enrichedRows.sort((a, b) => {`;

const renderReplacement = `        return { 
          m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, estimatedHmr, isOverdue, isApproaching
        };
      });

      document.getElementById('sts-overdue').textContent = overdueCount;
      document.getElementById('sts-approaching').textContent = approachingCount;

      const statusFilter = (document.getElementById('sts-status')?.value || '').toLowerCase();
      let displayRows = enrichedRows;
      if (statusFilter) {
          displayRows = displayRows.filter(obj => {
              if (statusFilter === 'overdue') return obj.isOverdue || obj.likelyOverdue;
              if (statusFilter === 'approaching') return obj.isApproaching && !obj.likelyOverdue;
              if (statusFilter === 'ontrack') return !obj.isOverdue && !obj.likelyOverdue && !obj.isApproaching;
              return true;
          });
      }

      displayRows.sort((a, b) => {`;

if (html.includes(renderTarget)) {
    html = html.replace(renderTarget, renderReplacement);
    
    // Now we also need to replace the references to enrichedRows down below with displayRows
    // There are 3 references to enrichedRows after this point
    const endSortTarget = `        if (valA < valB) return _stsSortAsc ? -1 : 1;
         if (valA > valB) return _stsSortAsc ? 1 : -1;
         return 0;
      });`;
    
    const afterSortBlock = html.substring(html.indexOf(endSortTarget) + endSortTarget.length);
    const beforeSortBlock = html.substring(0, html.indexOf(endSortTarget) + endSortTarget.length);
    
    // In afterSortBlock, replace "enrichedRows" with "displayRows"
    const newAfterSortBlock = afterSortBlock.replace(/enrichedRows/g, 'displayRows');
    
    html = beforeSortBlock + newAfterSortBlock;
} else {
    console.log("Failed to find render loop block!");
}

// 4. Update the Clear button string
const oldClearStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;filterStsTable()`;
const newClearStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;if(document.getElementById('sts-machine-search'))document.getElementById('sts-machine-search').value='';if(document.getElementById('sts-status'))document.getElementById('sts-status').value='';filterStsTable()`;
html = html.replace(oldClearStr, newClearStr);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Filters patched successfully!");
