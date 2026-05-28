"""
Add Initial Service Report (ISR) — machines with no Last Service value.
Changes:
  1. Dashboard rpt-hub grid: add ISR tile after WWU
  2. Reports dropdown nav: add ISR item
  3. showView hidden list: add view-rpt-isr element
  4. showView mapping: add view-rpt-isr entry
  5. showView auto-load block: add loadRptIsr() call
  6. Injected views HTML: add view-rpt-isr page
  7. JS loadRptIsr() function in the last script block
"""
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Dashboard tile — add ISR after the WWU tile
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WWU_TILE_END = """                       </div>
          
                     </div><!-- /quick-access grid -->"""

ISR_TILE = """
                       <div onclick="showView('view-rpt-isr')" style="cursor:pointer;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px;transition:box-shadow 0.15s,border-color 0.15s;" onmouseenter="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)';this.style.borderColor='#0ea5e9'" onmouseleave="this.style.boxShadow='none';this.style.borderColor='#e2e8f0'">
                         <div style="font-size:22px;">🔩</div>
                         <div style="font-weight:700;font-size:14px;color:#0f172a;">Initial Service Report</div>
                         <div style="font-size:11px;color:#64748b;">Machines with no recorded last service date or HMR.</div>
                         <div style="margin-top:4px;font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.5px;">ISR</div>
                       </div>"""

if WWU_TILE_END in content:
    # Insert ISR tile before the closing grid comment
    content = content.replace(
        WWU_TILE_END,
        ISR_TILE + '\n' + WWU_TILE_END,
        1
    )
    print('1. Dashboard ISR tile added OK')
else:
    print('1. WARNING: WWU tile end marker not found — skipping tile')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Reports dropdown nav item
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WWU_NAV = 'onclick="showView(\'view-rpt-wwu\');closeAllDropdowns();">'
ISR_NAV = WWU_NAV + '\n            <div class="top-nav-dropdown-item" onclick="showView(\'view-rpt-isr\');closeAllDropdowns();">'

# Find one occurrence in the Reports dropdown (not the Omnis AI one)
idx = content.find(WWU_NAV)
if idx != -1:
    # Insert ISR item right after the WWU closing </div>
    close_div = content.find('</div>', idx)
    if close_div != -1:
        insert_at = close_div + len('</div>')
        ISR_NAV_ITEM = '''
            <div class="top-nav-dropdown-item" onclick="showView('view-rpt-isr');closeAllDropdowns();">
              <svg class="dd-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Initial Service Report</span>
              <span class="tag-pill" style="background:rgba(14,165,233,0.15);color:#0ea5e9;">ISR</span>
            </div>'''
        content = content[:insert_at] + ISR_NAV_ITEM + content[insert_at:]
        print('2. Nav dropdown ISR item added OK')
    else:
        print('2. WARNING: Could not find </div> after WWU nav item')
else:
    print('2. WARNING: WWU nav item not found')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. showView hidden list — add view-rpt-isr
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIDDEN_WWU = "document.getElementById('view-rpt-wwu'),"
HIDDEN_ISR  = "document.getElementById('view-rpt-wwu'),\n        document.getElementById('view-rpt-isr'),"
content = content.replace(HIDDEN_WWU, HIDDEN_ISR, 1)
if HIDDEN_ISR in content:
    print('3. showView hidden list updated OK')
else:
    print('3. WARNING: hidden list not updated')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. showView mapping — add view-rpt-isr entry
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAPPING_WWU_END = """        "view-rpt-wwu": {
          el: document.getElementById('view-rpt-wwu'),
          title: "Weekly Warranty Update (WWU)",
          subtitle: "Warranty status, expiry and handover dates for all managed machines.",
          actionLabel: "Refresh",
          action: () => loadRptWwu(),
        },
      };"""

MAPPING_ISR = """        "view-rpt-wwu": {
          el: document.getElementById('view-rpt-wwu'),
          title: "Weekly Warranty Update (WWU)",
          subtitle: "Warranty status, expiry and handover dates for all managed machines.",
          actionLabel: "Refresh",
          action: () => loadRptWwu(),
        },
        "view-rpt-isr": {
          el: document.getElementById('view-rpt-isr'),
          title: "Initial Service Report (ISR)",
          subtitle: "Machines with no recorded last service — candidates for first scheduled service.",
          actionLabel: "Refresh",
          action: () => loadRptIsr(),
        },
      };"""

if MAPPING_WWU_END in content:
    content = content.replace(MAPPING_WWU_END, MAPPING_ISR, 1)
    print('4. showView mapping updated OK')
else:
    print('4. WARNING: mapping WWU end not found')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. showView auto-load block
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTOLOAD_WWU = "if (viewId === 'view-rpt-wwu') loadRptWwu();"
AUTOLOAD_ISR = "if (viewId === 'view-rpt-wwu') loadRptWwu();\n      if (viewId === 'view-rpt-isr') loadRptIsr();"
content = content.replace(AUTOLOAD_WWU, AUTOLOAD_ISR, 1)
if AUTOLOAD_ISR in content:
    print('5. showView auto-load updated OK')
else:
    print('5. WARNING: auto-load WWU not found')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. Injected view HTML — add view-rpt-isr before </body>
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ISR_VIEW_HTML = """
  <!-- ── ISR View ── -->
  <div id="view-rpt-isr" class="view-page hidden">
    <div class="rpt-view-wrap">
      <div class="rpt-view-header">
        <div>
          <h2 class="rpt-view-title">Initial Service Report <span style="font-size:13px;font-weight:600;color:#94a3b8;">(ISR)</span></h2>
          <p class="rpt-view-sub">Machines with no recorded last service — candidates for their first scheduled service.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <div class="rpt-kpi-pill" style="background:#e0f2fe;color:#0369a1;"><span id="isr-count">—</span><label>No Service</label></div>
          <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="isr-high-hmr">—</span><label>High HMR</label></div>
          <button class="rpt-action-btn" onclick="exportRptCsv('isr-table','initial_service_report')">⬇ CSV</button>
          <button class="rpt-action-btn rpt-action-primary" onclick="loadRptIsr()">↺ Refresh</button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="rpt-filter-bar">
        <div class="rpt-filter-group">
          <label>Region</label>
          <select id="isr-region" onchange="filterIsrTable()">
            <option value="">All Regions</option>
          </select>
        </div>
        <div class="rpt-filter-group">
          <label>Customer</label>
          <input type="text" id="isr-customer" placeholder="Filter by customer…" oninput="filterIsrTable()">
        </div>
        <div class="rpt-filter-group">
          <label>Model</label>
          <input type="text" id="isr-model" placeholder="Filter by model…" oninput="filterIsrTable()">
        </div>
        <div class="rpt-filter-group" style="flex:0 0 auto;">
          <label>Min HMR</label>
          <input type="number" id="isr-min-hmr" placeholder="0" min="0" style="width:90px;" oninput="filterIsrTable()">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="rpt-action-btn" onclick="document.getElementById('isr-region').value='';document.getElementById('isr-customer').value='';document.getElementById('isr-model').value='';document.getElementById('isr-min-hmr').value='';filterIsrTable()">Clear</button>
        </div>
      </div>

      <!-- Table -->
      <div class="rpt-table-wrap">
        <table class="rpt-table" id="isr-table">
          <thead>
            <tr>
              <th onclick="sortRptTable('isr-table',0)">Machine</th>
              <th onclick="sortRptTable('isr-table',1)">Serial No</th>
              <th onclick="sortRptTable('isr-table',2)">Model</th>
              <th onclick="sortRptTable('isr-table',3)">OEM</th>
              <th onclick="sortRptTable('isr-table',4)">Customer</th>
              <th onclick="sortRptTable('isr-table',5)">Region</th>
              <th onclick="sortRptTable('isr-table',6)" style="text-align:right;">Current HMR</th>
              <th>Last Service</th>
              <th>Warranty</th>
            </tr>
          </thead>
          <tbody id="isr-tbody">
            <tr><td colspan="9" class="rpt-loading">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>"""

last_body = content.rfind('</body>')
if last_body != -1:
    content = content[:last_body] + ISR_VIEW_HTML + '\n' + content[last_body:]
    print('6. View HTML injected OK')
else:
    print('6. ERROR: </body> not found')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. JS — add loadRptIsr() to the last script block
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ISR_JS = """
    // ── Initial Service Report (ISR) ─────────────────────────────────────
    let _isrAllRows = [];

    async function loadRptIsr() {
      const tbody = document.getElementById('isr-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="rpt-loading">Loading…</td></tr>';
      try {
        const res = await callFrappe(
          'https://fleetrack.machinery-exchange.com/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          {}
        );
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);

        // ISR = machines where last_service_date AND last_service_hmr are both absent/zero
        const isr = raw.filter(m => {
          const noDate = !m.last_service_date || m.last_service_date === '';
          const noHmr  = !m.last_service_hmr  || Number(m.last_service_hmr) === 0;
          return noDate && noHmr;
        });

        _isrAllRows = isr;

        // Populate region filter
        const regionSel = document.getElementById('isr-region');
        if (regionSel) {
          const regions = [...new Set(isr.map(m => m.region).filter(Boolean))].sort();
          regionSel.innerHTML = '<option value="">All Regions</option>' +
            regions.map(r => `<option value="${r}">${r}</option>`).join('');
        }

        // KPIs
        const highHmr = isr.filter(m => Number(m.current_hmr) >= 500).length;
        const countEl = document.getElementById('isr-count');
        const hmrEl   = document.getElementById('isr-high-hmr');
        if (countEl) countEl.textContent = isr.length;
        if (hmrEl)   hmrEl.textContent   = highHmr;

        renderIsrTable(isr);
      } catch (e) {
        console.error('[ISR] load error', e);
        const tbody = document.getElementById('isr-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="rpt-loading" style="color:#ef4444;">Error loading data — check connection.</td></tr>';
      }
    }

    function renderIsrTable(rows) {
      const tbody = document.getElementById('isr-tbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="rpt-loading" style="color:#22c55e;">✓ All machines have a recorded last service date.</td></tr>';
        return;
      }
      // Sort by current HMR descending (highest priority first)
      rows = [...rows].sort((a, b) => Number(b.current_hmr || 0) - Number(a.current_hmr || 0));
      tbody.innerHTML = rows.map(m => {
        const hmr = Number(m.current_hmr || 0);
        const hmrColour = hmr >= 1000 ? '#ef4444' : hmr >= 500 ? '#f59e0b' : '#64748b';
        const warranty = m.warranty_status || '—';
        return `<tr>
          <td style="font-weight:600;color:#0f172a;">${m.name || '—'}</td>
          <td style="color:#475569;font-family:monospace;">${m.serial_no || '—'}</td>
          <td>${m.model || '—'}</td>
          <td>${m.oem || '—'}</td>
          <td>${m.customer || '—'}</td>
          <td>${m.region || '—'}</td>
          <td style="text-align:right;font-weight:700;color:${hmrColour};">${hmr.toLocaleString()}</td>
          <td><span style="font-size:11px;background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:6px;font-weight:600;">No Service</span></td>
          <td style="font-size:11px;">${warranty}</td>
        </tr>`;
      }).join('');
    }

    function filterIsrTable() {
      const region  = (document.getElementById('isr-region')?.value  || '').toLowerCase();
      const customer= (document.getElementById('isr-customer')?.value || '').toLowerCase();
      const model   = (document.getElementById('isr-model')?.value   || '').toLowerCase();
      const minHmr  = Number(document.getElementById('isr-min-hmr')?.value || 0);
      const filtered = _isrAllRows.filter(m =>
        (!region   || (m.region   || '').toLowerCase().includes(region))   &&
        (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
        (!model    || (m.model    || '').toLowerCase().includes(model))    &&
        (Number(m.current_hmr || 0) >= minHmr)
      );
      renderIsrTable(filtered);
    }
"""

last_script_end = content.rfind('</script>')
if last_script_end != -1:
    content = content[:last_script_end] + ISR_JS + '\n    </script>' + content[last_script_end + 9:]
    print('7. JS loadRptIsr() injected OK')
else:
    print('7. ERROR: no </script> found')

# Save
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('\nAll done — file saved.')
