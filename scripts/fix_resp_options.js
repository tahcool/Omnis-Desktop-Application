const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const filterOld = `              <select id="dbr-filter-responsibility" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                <option value="">All</option>
                <option value="FSD">FSD</option>
                <option value="WSD">WSD</option>
              </select>`;
const filterNew = `              <select id="dbr-filter-responsibility" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                <option value="">All</option>
                <option value="FSD">FSD</option>
                <option value="WSD">WSD</option>
                <option value="IFN">IFN</option>
                <option value="CFN">CFN</option>
              </select>`;
html = html.replace(filterOld, filterNew);

const editOld = `            <select id="db-edit-resp" style="width:100%; height:40px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
              <option value="FSD">FSD</option>
              <option value="Customer">Customer</option>
              <option value="Workshop">Workshop</option>
            </select>`;
const editNew = `            <select id="db-edit-resp" style="width:100%; height:40px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
              <option value="FSD">FSD</option>
              <option value="WSD">WSD</option>
              <option value="IFN">IFN</option>
              <option value="CFN">CFN</option>
              <option value="Customer">Customer</option>
              <option value="Workshop">Workshop</option>
            </select>`;
html = html.replace(editOld, editNew);

const jsOld = `if (filters.responsibility) query = query.eq('responsibility', filters.responsibility);`;
const jsNew = `if (filters.responsibility) query = query.ilike('responsibility', \`%\${filters.responsibility}%\`);`;
html = html.replace(jsOld, jsNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Updated responsibility filters and edit modal options.");
