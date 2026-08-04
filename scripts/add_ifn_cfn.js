const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const filterRespOld = `              <select id="dbr-filter-responsibility" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                <option value="">All</option>
                <option value="FSD">FSD</option>
                <option value="WSD">WSD</option>
                <option value="IFN">IFN</option>
                <option value="CFN">CFN</option>
              </select>`;
const filterRespNew = `              <select id="dbr-filter-responsibility" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                <option value="">All</option>
                <option value="FSD">FSD</option>
                <option value="WSD">WSD</option>
              </select>`;
html = html.replace(filterRespOld, filterRespNew);

const editRespOld = `            <select id="db-edit-resp" style="width:100%; height:40px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
              <option value="FSD">FSD</option>
              <option value="WSD">WSD</option>
              <option value="IFN">IFN</option>
              <option value="CFN">CFN</option>
              <option value="Customer">Customer</option>
              <option value="Workshop">Workshop</option>
            </select>`;
const editRespNew = `            <select id="db-edit-resp" style="width:100%; height:40px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
              <option value="FSD">FSD</option>
              <option value="WSD">WSD</option>
              <option value="Customer">Customer</option>
              <option value="Workshop">Workshop</option>
            </select>`;
html = html.replace(editRespOld, editRespNew);

// Add IFN and CFN fields
const filtersOld = `            <div style="flex:1; min-width:140px;">
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Responsibility</label>`;
const filtersNew = `            <div style="flex:1; min-width:120px;">
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">IFN</label>
              <input type="text" id="dbr-filter-ifn" placeholder="IFN..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
            </div>
            <div style="flex:1; min-width:120px;">
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">CFN</label>
              <input type="text" id="dbr-filter-cfn" placeholder="CFN..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
            </div>
            <div style="flex:1; min-width:140px;">
              <label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Responsibility</label>`;
html = html.replace(filtersOld, filtersNew);

// Update Reset button to clear IFN and CFN
const resetBtnOld = `document.getElementById('dbr-filter-responsibility').value=''; document.getElementById('dbr-filter-urgent').checked=false;`;
const resetBtnNew = `document.getElementById('dbr-filter-responsibility').value=''; document.getElementById('dbr-filter-urgent').checked=false; document.getElementById('dbr-filter-ifn').value=''; document.getElementById('dbr-filter-cfn').value='';`;
html = html.replace(resetBtnOld, resetBtnNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Reverted responsibility options and added IFN/CFN filters.");
