const fs = require('fs');
const filePath = 'systems/fleetrack/index.html';
let html = fs.readFileSync(filePath, 'utf8');

const targetSearch = `      // Slice for pagination
      const startIndex = (DBR_PAGE - 1) * DBR_PAGE_SIZE;
      const paginatedData = dataToRender.slice(startIndex, startIndex + DBR_PAGE_SIZE);

      paginatedData.forEach((row, i) => {
        const index = startIndex + i;
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #e5e7f0;";

        // Map snake_case to format
        const customer = row.customer || "—";
        const customerRef = row.customer_ref ? \`<div style="font-size:10px;color:var(--text-muted);">Ref: <strong>\${safeText(row.customer_ref)}</strong></div>\` : "";
        const region = row.region ? \`<div style="font-size:10px;color:var(--text-muted);">\${safeText(row.region)}</div>\` : "";

        const machine = row.model || "—";
        const sn = row.serial_number ? \`<div style="font-size:10px;color:var(--text-muted);">SN: \${safeText(row.serial_number)}</div>\` : "";
        const fleetNo = row.fleet_no ? \`<div style="font-size:10px;color:var(--text-muted);">Fleet: <strong>\${safeText(row.fleet_no)}</strong></div>\` : "";
        const hmr = row.current_hmr ? \`<div style="font-size:10px;color:var(--text-muted);">HMR: \${safeText(row.current_hmr)}</div>\` : "";

        let wtyBadge = "";
        if (row.warranty_status && row.warranty_status !== "Out of Warranty" && row.warranty_status !== "N/A") {
          wtyBadge = \`<span style="font-size:9px;background:#fee2e2;color:#ef4444;padding:2px 4px;border-radius:4px;display:inline-block;margin-top:2px;">\${safeText(row.warranty_status)}</span>\`;
        }

        const date = row.breakdown_date ? formatDateDA(row.breakdown_date) : "—";

        // TED / RED / ETA formatting
        const ted = row.ted ? formatDateDA(row.ted) : (row.ted_status || "—");
        const red = row.red ? formatDateDA(row.red) : "—";

        // Status formatting
        const status = safeText(row.status);
        const quoted = row.quoted_date ? \`<div style="font-size:9px;color:#64748b;margin-top:2px;">Quoted: \${formatDateDA(row.quoted_date)}</div>\` : "";

        // ETA
        const partsEta = row.parts_eta ? \`<div>\${formatDateDA(row.parts_eta)}</div>\` : "";
        const outEta = row.out_eta ? \`<div style="font-size:10px;color:#64748b;margin-top:2px;">Outwork: \${formatDateDA(row.out_eta)}</div>\` : "";

        const commonTdStyle = "padding:12px 8px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; border-right: 1px solid #f1f5f9;";

        if (row.urgent) {
          tr.classList.add("urgent-row");
        }

        tr.innerHTML = \`
      <td style="\${commonTdStyle}text-align:center;font-weight:700;color:#64748b;font-size:12px;">\${index + 1}</td>
      <td style="\${commonTdStyle}">
        <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">\${safeText(customer)}</div>
      \${customerRef}
      \${region}
    </td>\`;`; // ADDED BACKTICK AND SEMICOLON HERE!!!

const targetReplace = `      const isGrouped = document.getElementById("dbr-group-customer")?.checked;
      if (isGrouped) {
          dataToRender.sort((a,b) => (a.customer||'').localeCompare(b.customer||''));
      }

      // Slice for pagination
      const startIndex = (DBR_PAGE - 1) * DBR_PAGE_SIZE;
      const paginatedData = dataToRender.slice(startIndex, startIndex + DBR_PAGE_SIZE);

      const customerRowSpans = {};
      if (isGrouped) {
          let i = 0;
          while (i < paginatedData.length) {
              const cust = paginatedData[i].customer || 'Unknown Customer';
              let count = 1;
              for (let j = i + 1; j < paginatedData.length; j++) {
                  if ((paginatedData[j].customer || 'Unknown Customer') === cust) count++;
                  else break;
              }
              customerRowSpans[i] = count;
              for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
              i += count;
          }
      }

      paginatedData.forEach((row, i) => {
        const index = startIndex + i;
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #e5e7f0;";

        // Map snake_case to format
        const customer = row.customer || "—";
        const customerRef = row.customer_ref ? \`<div style="font-size:10px;color:var(--text-muted);">Ref: <strong>\${safeText(row.customer_ref)}</strong></div>\` : "";
        const region = row.region ? \`<div style="font-size:10px;color:var(--text-muted);">\${safeText(row.region)}</div>\` : "";

        const machine = row.model || "—";
        const sn = row.serial_number ? \`<div style="font-size:10px;color:var(--text-muted);">SN: \${safeText(row.serial_number)}</div>\` : "";
        const fleetNo = row.fleet_no ? \`<div style="font-size:10px;color:var(--text-muted);">Fleet: <strong>\${safeText(row.fleet_no)}</strong></div>\` : "";
        const hmr = row.current_hmr ? \`<div style="font-size:10px;color:var(--text-muted);">HMR: \${safeText(row.current_hmr)}</div>\` : "";

        let wtyBadge = "";
        if (row.warranty_status && row.warranty_status !== "Out of Warranty" && row.warranty_status !== "N/A") {
          wtyBadge = \`<span style="font-size:9px;background:#fee2e2;color:#ef4444;padding:2px 4px;border-radius:4px;display:inline-block;margin-top:2px;">\${safeText(row.warranty_status)}</span>\`;
        }

        const date = row.breakdown_date ? formatDateDA(row.breakdown_date) : "—";

        // TED / RED / ETA formatting
        const ted = row.ted ? formatDateDA(row.ted) : (row.ted_status || "—");
        const red = row.red ? formatDateDA(row.red) : "—";

        // Status formatting
        const status = safeText(row.status);
        const quoted = row.quoted_date ? \`<div style="font-size:9px;color:#64748b;margin-top:2px;">Quoted: \${formatDateDA(row.quoted_date)}</div>\` : "";

        // ETA
        const partsEta = row.parts_eta ? \`<div>\${formatDateDA(row.parts_eta)}</div>\` : "";
        const outEta = row.out_eta ? \`<div style="font-size:10px;color:#64748b;margin-top:2px;">Outwork: \${formatDateDA(row.out_eta)}</div>\` : "";

        const commonTdStyle = "padding:12px 8px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; border-right: 1px solid #f1f5f9;";

        if (row.urgent) {
          tr.classList.add("urgent-row");
        }
        
        let custCell = "";
        const cName = safeText(customer);
        if (isGrouped) {
            if (customerRowSpans[i] > 0) {
                custCell = \`<td rowspan="\${customerRowSpans[i]}" style="padding:12px 16px; vertical-align:middle; background:#fcfcfc; word-wrap:break-word; border-bottom:1px solid #e5e7eb; border-right:1px solid #e5e7eb; min-width:140px;">
                    <div style="font-weight:800;color:#0f172a;font-size:12px;line-height:1.2;">\${cName}</div>
                    <div style="font-size:10px; color:#64748b; margin-top:4px; font-weight:600;">\${customerRowSpans[i]} Breakdowns</div>
                </td>\`;
            }
        } else {
            custCell = \`<td style="\${commonTdStyle}">
                <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">\${cName}</div>
                \${customerRef}
                \${region}
            </td>\`;
        }

        tr.innerHTML = \`
      <td style="\${commonTdStyle}text-align:center;font-weight:700;color:#64748b;font-size:12px;">\${index + 1}</td>
      \${custCell}\`;

const uiSearch = \`                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-filter-closed" style="width:16px; height:16px; cursor:pointer;">
                  <label for="dbr-filter-closed" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap;">Include Closed</label>
                </div>
              </div>\`;

const uiReplace = \`                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-group-customer" onchange="loadDailyBreakdownReport()" style="width:16px; height:16px; cursor:pointer; accent-color:#f02510;">
                  <label for="dbr-group-customer" style="font-size:13px; font-weight:700; color:#64748b; cursor:pointer; white-space:nowrap; text-transform:uppercase;">GROUP BY CUST</label>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="dbr-filter-closed" style="width:16px; height:16px; cursor:pointer;">
                  <label for="dbr-filter-closed" style="font-size:13px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap;">Include Closed</label>
                </div>
              </div>\`;

const resetSearch = \`document.getElementById('dbr-filter-closed').checked=false; document.getElementById('dbr-filter-ifn').value='';\`;
const resetReplace = \`document.getElementById('dbr-filter-closed').checked=false; document.getElementById('dbr-group-customer').checked=false; document.getElementById('dbr-filter-ifn').value='';\`;

html = html.replace(targetSearch, targetReplace);
html = html.replace(uiSearch, uiReplace);
html = html.replace(resetSearch, resetReplace);

fs.writeFileSync(filePath, html);
console.log("DBR Grouping updated successfully.");
