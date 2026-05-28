const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const isrHtml = `
      <!-- Initial Service Report (ISR) View -->
      <div id="view-isr" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--glass-border);">
            <div>
              <h2 style="font-size:22px;font-weight:800;color:var(--text-main);letter-spacing:-0.5px;">Initial Service Report <span style="color:var(--accent);">(ISR)</span></h2>
              <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Machines with no recorded last service date — require initial service.</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <div id="isr-kpi-badge" style="background:var(--accent);color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;display:none;"></div>
              <button onclick="printISR()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">🖶 Print</button>
              <button onclick="loadISR()" style="background:var(--bg-main);border:1px solid var(--glass-border);padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text-main);">↻ Refresh</button>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Filter:</label>
            <select id="isr-filter-region" onchange="loadISR()" style="border:1px solid var(--glass-border);border-radius:8px;padding:6px 12px;font-size:12px;background:var(--bg-main);color:var(--text-main);">
              <option value="">All Regions</option>
              <option value="Hwange">Hwange</option>
              <option value="Harare">Harare</option>
              <option value="Bulawayo">Bulawayo</option>
              <option value="Turk Mine">Turk Mine</option>
              <option value="Tariro">Tariro</option>
              <option value="Pickstone">Pickstone</option>
              <option value="Chinhoyi">Chinhoyi</option>
              <option value="Redwing">Redwing</option>
              <option value="Sabi">Sabi</option>
              <option value="Connemara">Connemara</option>
            </select>
          </div>
          <div id="isr-table-container" style="overflow-x:auto;">
            <div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">Click Refresh to load ISR Data</div>
          </div>
        </div>
      </div>
`;

const insertBefore = '<!-- MACHINE DETAIL VIEW -->';
const insertIdx = c.indexOf(insertBefore);
if(insertIdx >= 0 && !c.includes('id="view-isr"')) {
    c = c.substring(0, insertIdx) + isrHtml + c.substring(insertIdx);
    console.log("Injected ISR HTML");
} else {
    console.log("Could not inject ISR HTML");
}

const globalJs = `
    window.openISRReport = function() {
        console.log('[ISR] openISRReport called');
        const views = document.querySelectorAll('.view-page, .view-item');
        views.forEach(v => v.classList.add('hidden'));
        
        const isrView = document.getElementById('view-isr');
        if (isrView) {
            isrView.classList.remove('hidden');
            window.scrollTo(0,0);
            if (typeof loadISR === 'function') loadISR();
        } else {
            console.error('view-isr not found');
        }
    };
`;

if(!c.includes('window.openISRReport = function')) {
    const endIdx = c.indexOf('</body>');
    if(endIdx >= 0) {
        c = c.substring(0, endIdx) + globalJs + c.substring(endIdx);
        console.log("Injected JS");
    }
}

fs.writeFileSync('index.html', c, 'utf8');