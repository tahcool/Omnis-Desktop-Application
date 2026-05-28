const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const isrHtml = `      <!-- Initial Service Report (ISR) View -->
      <div id="view-isr" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--glass-border);">
            <div>
              <h2 style="font-size:22px;font-weight:800;color:var(--text-main);letter-spacing:-0.5px;">Initial Service Report <span style="color:var(--accent);">(ISR)</span></h2>
              <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Machines with no recorded last service date - require initial service.</p>
            </div>
            <div style="display:flex;gap:12px;align-items:center;">
              <div id="isr-kpi-badge" style="background:#eef2ff;color:#4f46e5;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;display:none;"></div>
              <select id="isr-filter-region" style="padding:8px 16px;border-radius:8px;border:1px solid var(--glass-border);background:var(--bg-card);color:var(--text-main);font-size:13px;outline:none;" onchange="loadISR()">
                <option value="">All Regions</option>
                <option value="Zimbabwe">Zimbabwe</option>
                <option value="Zambia">Zambia</option>
                <option value="South Africa">South Africa</option>
              </select>
              <button class="btn btn-outline" onclick="window.showView('view-dashboard')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back
              </button>
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:12px;color:var(--text-muted);font-weight:600;font-size:12px;border-bottom:2px solid var(--glass-border);">MACHINE</th>
                  <th style="text-align:left;padding:12px;color:var(--text-muted);font-weight:600;font-size:12px;border-bottom:2px solid var(--glass-border);">MODEL / SERIAL</th>
                  <th style="text-align:left;padding:12px;color:var(--text-muted);font-weight:600;font-size:12px;border-bottom:2px solid var(--glass-border);">CUSTOMER</th>
                  <th style="text-align:left;padding:12px;color:var(--text-muted);font-weight:600;font-size:12px;border-bottom:2px solid var(--glass-border);">REGION</th>
                </tr>
              </thead>
              <tbody id="isr-table-container"></tbody>
            </table>
          </div>
        </div>
      </div>
`;

c = c.replace('      <!-- MACHINE DETAIL VIEW -->', isrHtml + '\n      <!-- MACHINE DETAIL VIEW -->');

// Add to switchView logic
c = c.replace(
  "document.querySelectorAll('.view-page').forEach(el => el.classList.add('hidden'));",
  "document.querySelectorAll('.view-page').forEach(el => el.classList.add('hidden'));\n      if(viewId==='view-isr') window.loadISR();"
);

// Add openISRReport hook
c = c.replace(
  "window.openHmrActivityReport",
  "window.openISRReport = function() { window.showView('view-isr'); }\n    window.openHmrActivityReport"
);

// Add Top Nav Dropdown item
c = c.replace(
  '<div class="top-nav-dropdown-item" onclick="showView(\'view-breakdown-log\')">',
  '<div class="top-nav-dropdown-item" onclick="window.openISRReport()">\n              <span class="icon" style="margin-right:8px; opacity:0.7;">📋</span> Initial Service Report\n            </div>\n            <div class="top-nav-dropdown-item" onclick="showView(\'view-breakdown-log\')">'
);

let isrJs = fs.readFileSync('loadISR_supabase.js', 'utf8');
// Fix invalid char
isrJs = isrJs.replace(/\uFFFD/g, "-").replace(/\u2014/g, "-");

const lastScriptEnd = c.lastIndexOf('</script>');
c = c.substring(0, lastScriptEnd) + '\n' + isrJs + '\n' + c.substring(lastScriptEnd);

fs.writeFileSync('index.html', c);
console.log('ISR view and JS injected successfully.');
