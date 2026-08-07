const fs = require('fs');
const filePath = 'systems/fleetrack/index.html';
let html = fs.readFileSync(filePath, 'utf8');

const uiSearch = `                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-filter-closed" style="width:16px; height:16px; cursor:pointer;">
                  <label for="dbr-filter-closed" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap;">Include Closed</label>
                </div>
              </div>`;

const uiReplace = `                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-group-customer" style="width:16px; height:16px; cursor:pointer;">
                  <label for="dbr-group-customer" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap;">Group by Customer</label>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-filter-closed" style="width:16px; height:16px; cursor:pointer;">
                  <label for="dbr-filter-closed" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap;">Include Closed</label>
                </div>
              </div>`;

const tableSearch = `          <!-- Table -->
          <div style="overflow-x:auto;">
            <table id="dbr-table"`;

const tableReplace = `          <!-- Accordion Wrapper -->
          <div id="dbr-accordion-wrap" style="display:none; flex-direction:column; gap:12px; margin-bottom:20px;"></div>

          <!-- Table -->
          <div id="dbr-table-wrap" style="overflow-x:auto;">
            <table id="dbr-table"`;

const resetSearch = `document.getElementById('dbr-filter-closed').checked=false; document.getElementById('dbr-filter-ifn').value='';`;
const resetReplace = `document.getElementById('dbr-filter-closed').checked=false; document.getElementById('dbr-group-customer').checked=false; document.getElementById('dbr-filter-ifn').value='';`;

html = html.replace(uiSearch, uiReplace);
html = html.replace(tableSearch, tableReplace);
html = html.replace(resetSearch, resetReplace);

fs.writeFileSync(filePath, html);
console.log("HTML UI updated successfully.");
