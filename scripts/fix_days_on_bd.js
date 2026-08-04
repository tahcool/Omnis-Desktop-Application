const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Fix data mapping to compute days_on_bd and map properties for backward compatibility in the UI
const targetDataMap = `let data = { breakdowns: (dbData || []).map(r => ({ ...r, name: r.frappe_name || r.id })),`;
const newDataMap = `let data = { breakdowns: (dbData || []).map(r => {
          let bd = { ...r, name: r.frappe_name || r.id, supervisor_comment: r.manager_comments, resp: r.responsibility, end_date: r.breakdown_end_date };
          if (bd.breakdown_date) {
            const start = new Date(bd.breakdown_date);
            const end = bd.breakdown_end_date ? new Date(bd.breakdown_end_date) : new Date();
            bd.days_on_bd = Math.floor((end - start) / (1000 * 60 * 60 * 24));
          } else {
            bd.days_on_bd = 0;
          }
          return bd;
        }),`;
html = html.replace(targetDataMap, newDataMap);

// 2. The Edit Button issue might be because it throws an error in openDbrEditModal, or it's not even triggering?
// Wait, the user said "edit option it is not working". It's possible there is another error.
// Let's also make sure `saveDbrEdit` maps properly if it reads the fields. 
// In `refactor_breakdowns_supabase.js`, I wrote `payload.resp` etc. So `payload` in save function must be sending `resp`.

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Fixes applied");
