const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const target1 = `      document.getElementById('sts-approaching').textContent = approachingCount;

      enrichedRows.sort((a, b) => {`;
      
const replace1 = `      document.getElementById('sts-approaching').textContent = approachingCount;

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

html = html.replace(target1, replace1);

// Now replace enrichedRows with displayRows in the render block below this
const startIdx = html.indexOf('displayRows.sort((a, b) => {');
const endIdx = html.indexOf('tbody.innerHTML =', startIdx) + 200;

let block = html.substring(startIdx, endIdx);
block = block.replace(/enrichedRows/g, 'displayRows');

html = html.substring(0, startIdx) + block + html.substring(endIdx);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Patched renderStsTable JS successfully!");
