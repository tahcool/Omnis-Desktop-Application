const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';filterStsTable()`;
const replaceStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;filterStsTable()`;

if (html.includes(targetStr)) {
    const splitHTML = html.split('<div style="display:flex;align-items:flex-end;">\n            <button class="rpt-action-btn" onclick="' + targetStr + '">Clear</button>\n          </div>');
    if(splitHTML.length > 1) {
       html = splitHTML.join(`          <div class="rpt-filter-group" style="flex:0 0 auto;">
            <label>Group View</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;height:38px;padding:0 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;font-size:13px;color:#475569;user-select:none;">
              <input type="checkbox" id="sts-group-customer" onchange="filterStsTable()" style="cursor:pointer;width:16px;height:16px;accent-color:#ef4444;margin:0;">
              By Customer
            </label>
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button class="rpt-action-btn" onclick="${replaceStr}">Clear</button>
          </div>`);
       fs.writeFileSync('systems/fleetrack/index.html', html);
       console.log("Replaced using exact match splits!");
    } else {
        // Fallback: the indentation might be slightly different.
        // Let's find the index of the clear button logic and insert before the div.
        const idx = html.indexOf(targetStr);
        if (idx !== -1) {
            const divStart = html.lastIndexOf('<div', idx);
            const before = html.substring(0, divStart);
            const after = html.substring(divStart);
            const newHtml = before + `          <div class="rpt-filter-group" style="flex:0 0 auto;">
            <label>Group View</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;height:38px;padding:0 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;font-size:13px;color:#475569;user-select:none;">
              <input type="checkbox" id="sts-group-customer" onchange="filterStsTable()" style="cursor:pointer;width:16px;height:16px;accent-color:#ef4444;margin:0;">
              By Customer
            </label>
          </div>\n` + after.replace(targetStr, replaceStr);
            fs.writeFileSync('systems/fleetrack/index.html', newHtml);
            console.log("Replaced using fallback index search!");
        } else {
            console.log("Could not find targetStr!");
        }
    }
} else {
    // If we've already patched the logic (i.e. targetStr is not there because we replaced it), check if sts-group-customer exists
    if(html.includes('id="sts-group-customer"')) {
        console.log("Already patched.");
    } else {
        console.log("Target string not found in file and not already patched.");
    }
}
