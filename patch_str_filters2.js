const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Update HTML filter bar
const filterBarTarget = `<div class="rpt-filter-group" style="flex:0 0 auto;">\n            <label>Group View</label>`;
if (html.includes(filterBarTarget)) {
    const filterReplacement = `<div class="rpt-filter-group" style="flex:1;">
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
          </div>
          ` + filterBarTarget;
    html = html.replace(filterBarTarget, filterReplacement);
    console.log("Patched filter HTML");
} else {
    console.log("Failed to find filter HTML block!");
}

// 2. Update filterStsTable function
const filterFuncTarget = `      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');`;
if (html.includes(filterFuncTarget)) {
    const filterFuncReplacement = `      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');
      const machineSearch = (document.getElementById('sts-machine-search')?.value || '').toLowerCase();`;
    
    // Also we need to inject the mStr and search logic into the filter
    const returnTarget = `        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))
        );`;
        
    const returnReplacement = `        const mStr = ((m.name||'') + ' ' + (m.sn||'')).toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model)) &&
          (!machineSearch || mStr.includes(machineSearch))
        );`;
        
    html = html.replace(filterFuncTarget, filterFuncReplacement);
    html = html.replace(returnTarget, returnReplacement);
    console.log("Patched filterStsTable JS");
} else {
    console.log("Failed to find filter logic block!");
}

// 3. Update renderStsTable to filter by status
const renderTarget = `      document.getElementById('sts-approaching').textContent = approachingCount;

      enrichedRows.sort((a, b) => {`;

const renderReplacement = `      document.getElementById('sts-approaching').textContent = approachingCount;

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
    
    // Now replace the remaining enrichedRows with displayRows in the render function
    const isGroupedTarget = `const isGrouped = document.getElementById('sts-group-customer')?.checked;`;
    const renderBlockStart = html.indexOf(renderReplacement);
    const renderBlockEnd = html.indexOf('tbody.innerHTML =', renderBlockStart) + 200; // approximate length to cover both cases
    
    // We can just do a replace within the substring
    let afterSortBlock = html.substring(renderBlockStart + renderReplacement.length, renderBlockEnd);
    
    // In afterSortBlock, replace "enrichedRows" with "displayRows"
    afterSortBlock = afterSortBlock.replace(/enrichedRows/g, 'displayRows');
    
    html = html.substring(0, renderBlockStart + renderReplacement.length) + afterSortBlock + html.substring(renderBlockEnd);
    console.log("Patched renderStsTable JS");
} else {
    console.log("Failed to find renderTarget");
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Done.");
