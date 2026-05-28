"""
Build Native Standalone Reports inside the Fleetrack Dashboard.

Reports built:
 1. FT Machine Register      -> view-rpt-machine-reg
 2. Machines Due for Service -> view-rpt-due-service
 3. General Defects (GDR)    -> view-rpt-gdr
 4. Service Tracking (STS)   -> view-rpt-sts
 5. WSD Breakdown Report     -> view-rpt-wbd
 6. Maint. Warning (MWR)     -> view-rpt-mwr
 7. Weekly Warranty (WWU)    -> view-rpt-wwu

Strategy:
 - Inject 7 view-page divs before </body>
 - Inject JS load functions + hook into showView()
 - Update Reports Hub cards to use showView() instead of openNativeReport()
 - Remove Frappe iframe viewer (keep as fallback)
"""

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ─────────────────────────────────────────────────────────────────────────────
# 1. REPORT VIEW HTML  (injected just before </body>)
# ─────────────────────────────────────────────────────────────────────────────
RPT_VIEWS_HTML = '''
    <!-- ═══════════════════════════════════════════════════ -->
    <!--        NATIVE STANDALONE REPORT VIEWS              -->
    <!-- ═══════════════════════════════════════════════════ -->

    <!-- Shared report toolbar template (rendered by JS) -->

    <!-- ── 1. FT MACHINE REGISTER ─────────────────────── -->
    <div id="view-rpt-machine-reg" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">FT Machine Register</h2>
            <p class="rpt-view-sub">Full fleet — all machines, customers, HMR and warranty status</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" id="mr2-kpi-total"><span id="mr2-total">—</span><label>Total</label></div>
            <div class="rpt-kpi-pill" style="background:#dcfce7;color:#15803d;" id="mr2-kpi-active"><span id="mr2-active">—</span><label>Active</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;" id="mr2-kpi-maint"><span id="mr2-maint">—</span><label>In Maint.</label></div>
            <div class="rpt-kpi-pill" style="background:#dcfce7;color:#15803d;" id="mr2-kpi-warranty"><span id="mr2-warranty">—</span><label>Under Warranty</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('mr2-table','machine_register')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptMachineReg()">↺ Refresh</button>
          </div>
        </div>
        <!-- Filters -->
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Region</label>
            <select id="mr2-region" onchange="loadRptMachineReg()">
              <option value="">All Regions</option>
              <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
            </select>
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer</label>
            <input id="mr2-customer" type="text" placeholder="Search customer…" oninput="filterRptTable('mr2-table',this.value,[1])">
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Model / SN</label>
            <input id="mr2-model" type="text" placeholder="Search model or serial…" oninput="filterRptTable('mr2-table',this.value,[2,3])">
          </div>
          <div class="rpt-filter-group">
            <label>Warranty</label>
            <select id="mr2-warranty-filter" onchange="loadRptMachineReg()">
              <option value="">All</option>
              <option value="Under Warranty">Under Warranty</option>
              <option value="Out of Warranty">Out of Warranty</option>
            </select>
          </div>
          <div class="rpt-filter-group">
            <label>Status</label>
            <select id="mr2-status-filter" onchange="loadRptMachineReg()">
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <!-- Table -->
        <div class="rpt-table-wrap">
          <table id="mr2-table" class="rpt-table">
            <thead><tr>
              <th>Fleet No</th><th>Customer</th><th>Model</th><th>Serial No</th>
              <th>HMR</th><th>Location</th><th>Region</th><th>Status</th>
              <th>Warranty</th><th>Commission Date</th>
            </tr></thead>
            <tbody id="mr2-tbody"><tr><td colspan="10" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 2. MACHINES DUE FOR SERVICE ────────────────── -->
    <div id="view-rpt-due-service" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">Machines Due for Service</h2>
            <p class="rpt-view-sub">Machines approaching or past their scheduled service HMR threshold</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#fee2e2;color:#b91c1c;"><span id="ds-overdue">—</span><label>Overdue</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="ds-soon">—</span><label>Due Soon</label></div>
            <div class="rpt-kpi-pill"><span id="ds-total">—</span><label>Total</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('ds-table','due_service')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptDueService()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Region</label>
            <select id="ds-region" onchange="loadRptDueService()">
              <option value="">All Regions</option>
              <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
            </select>
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer</label>
            <input id="ds-customer" type="text" placeholder="Search customer…" oninput="filterRptTable('ds-table',this.value,[1])">
          </div>
          <div class="rpt-filter-group">
            <label>Urgency</label>
            <select id="ds-urgency" onchange="filterDsUrgency(this.value)">
              <option value="">All</option>
              <option value="overdue">Overdue</option>
              <option value="soon">Due Soon (&lt;500 HMR)</option>
            </select>
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="ds-table" class="rpt-table">
            <thead><tr>
              <th>Fleet No</th><th>Customer</th><th>Model</th><th>Serial No</th>
              <th>Region</th><th>Current HMR</th><th>Last Service HMR</th>
              <th>Service Interval</th><th>Next Due HMR</th><th>Status</th>
            </tr></thead>
            <tbody id="ds-tbody"><tr><td colspan="10" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 3. GENERAL DEFECTS REPORT (GDR) ────────────── -->
    <div id="view-rpt-gdr" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">General Defects Report <span style="font-size:13px;font-weight:600;color:#94a3b8;">GDR</span></h2>
            <p class="rpt-view-sub">All open and in-progress defects across the fleet</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#fee2e2;color:#b91c1c;"><span id="gdr-open">—</span><label>Open</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="gdr-progress">—</span><label>In Progress</label></div>
            <div class="rpt-kpi-pill" style="background:#dcfce7;color:#15803d;"><span id="gdr-closed">—</span><label>Closed</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('gdr-table','defects_report')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptGdr()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Priority</label>
            <select id="gdr-priority" onchange="filterRptTableSelect('gdr-table',this.value,3)">
              <option value="">All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          <div class="rpt-filter-group">
            <label>Status</label>
            <select id="gdr-status" onchange="filterRptTableSelect('gdr-table',this.value,4)">
              <option value="">All</option><option>Open</option><option>In Progress</option><option>Closed</option>
            </select>
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Machine / Customer</label>
            <input id="gdr-search" type="text" placeholder="Search machine or customer…" oninput="filterRptTable('gdr-table',this.value,[0,1])">
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="gdr-table" class="rpt-table">
            <thead><tr>
              <th>Machine</th><th>Customer</th><th>Defect Description</th>
              <th>Priority</th><th>Status</th><th>Technician</th><th>Reported</th><th>Days Open</th>
            </tr></thead>
            <tbody id="gdr-tbody"><tr><td colspan="8" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 4. SERVICE TRACKING SUMMARY (STS) ──────────── -->
    <div id="view-rpt-sts" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">Service Tracking Summary <span style="font-size:13px;font-weight:600;color:#94a3b8;">STS</span></h2>
            <p class="rpt-view-sub">All field service plans — status, technician, and scheduling overview</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#dbeafe;color:#2563eb;"><span id="sts-planned">—</span><label>Planned</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="sts-inprogress">—</span><label>In Progress</label></div>
            <div class="rpt-kpi-pill" style="background:#dcfce7;color:#15803d;"><span id="sts-completed">—</span><label>Completed</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('sts-table','service_tracking')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptSts()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Status</label>
            <select id="sts-status" onchange="filterRptTableSelect('sts-table',this.value,5)">
              <option value="">All</option><option>Proposed</option><option>Planned</option><option>In Progress</option><option>Completed</option>
            </select>
          </div>
          <div class="rpt-filter-group">
            <label>From</label>
            <input type="date" id="sts-from" onchange="loadRptSts()">
          </div>
          <div class="rpt-filter-group">
            <label>To</label>
            <input type="date" id="sts-to" onchange="loadRptSts()">
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer / Machine</label>
            <input id="sts-search" type="text" placeholder="Search…" oninput="filterRptTable('sts-table',this.value,[0,1])">
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="sts-table" class="rpt-table">
            <thead><tr>
              <th>Customer</th><th>Machine</th><th>Description</th>
              <th>Technician</th><th>Date</th><th>Status</th><th>Location</th>
            </tr></thead>
            <tbody id="sts-tbody"><tr><td colspan="7" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 5. WSD DAILY BREAKDOWN REPORT ──────────────── -->
    <div id="view-rpt-wbd" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">WSD Daily Breakdown Report</h2>
            <p class="rpt-view-sub">Workshop Service Division — open breakdowns and jobs</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#fee2e2;color:#b91c1c;"><span id="wbd-open">—</span><label>Open</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="wbd-progress">—</span><label>In Progress</label></div>
            <div class="rpt-kpi-pill"><span id="wbd-total">—</span><label>Total</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('wbd-table','wsd_breakdown')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptWbd()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>From Date</label>
            <input type="date" id="wbd-from" onchange="loadRptWbd()">
          </div>
          <div class="rpt-filter-group">
            <label>To Date</label>
            <input type="date" id="wbd-to" onchange="loadRptWbd()">
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer / Machine</label>
            <input id="wbd-search" type="text" placeholder="Search…" oninput="filterRptTable('wbd-table',this.value,[0,1,2])">
          </div>
          <div class="rpt-filter-group">
            <label>Status</label>
            <select id="wbd-status" onchange="filterRptTableSelect('wbd-table',this.value,4)">
              <option value="">All</option><option>Open</option><option>In Progress</option><option>Parts on Order</option><option>Closed</option>
            </select>
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="wbd-table" class="rpt-table">
            <thead><tr>
              <th>Customer</th><th>Model</th><th>Serial No</th><th>Description</th>
              <th>Status</th><th>Technician</th><th>Reported</th><th>Days on BD</th>
            </tr></thead>
            <tbody id="wbd-tbody"><tr><td colspan="8" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 6. MAINTENANCE WARNING REPORT (MWR) ────────── -->
    <div id="view-rpt-mwr" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">Maintenance Warning Report <span style="font-size:13px;font-weight:600;color:#94a3b8;">MWR</span></h2>
            <p class="rpt-view-sub">Machines with pending maintenance warnings from HMR thresholds</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#fee2e2;color:#b91c1c;"><span id="mwr-critical">—</span><label>Critical</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="mwr-warning">—</span><label>Warning</label></div>
            <div class="rpt-kpi-pill"><span id="mwr-total">—</span><label>Total</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('mwr-table','maint_warning')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptMwr()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Region</label>
            <select id="mwr-region" onchange="loadRptMwr()">
              <option value="">All Regions</option>
              <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
            </select>
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer</label>
            <input id="mwr-customer" type="text" placeholder="Search…" oninput="filterRptTable('mwr-table',this.value,[1])">
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="mwr-table" class="rpt-table">
            <thead><tr>
              <th>Fleet No</th><th>Customer</th><th>Model</th><th>Serial No</th>
              <th>Region</th><th>Current HMR</th><th>Last Service</th><th>HMR Since Service</th><th>Warning</th>
            </tr></thead>
            <tbody id="mwr-tbody"><tr><td colspan="9" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 7. WEEKLY WARRANTY UPDATE (WWU) ────────────── -->
    <div id="view-rpt-wwu" class="view-page hidden">
      <div class="rpt-view-wrap">
        <div class="rpt-view-header">
          <div>
            <h2 class="rpt-view-title">Weekly Warranty Update <span style="font-size:13px;font-weight:600;color:#94a3b8;">WWU</span></h2>
            <p class="rpt-view-sub">Warranty status, expiry, and handover dates for all managed machines</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="rpt-kpi-pill" style="background:#dcfce7;color:#15803d;"><span id="wwu-active">—</span><label>Under Warranty</label></div>
            <div class="rpt-kpi-pill" style="background:#fee2e2;color:#b91c1c;"><span id="wwu-expired">—</span><label>Expired</label></div>
            <div class="rpt-kpi-pill" style="background:#fef9c3;color:#a16207;"><span id="wwu-expiring">—</span><label>Expiring Soon</label></div>
            <button class="rpt-action-btn" onclick="exportRptCsv('wwu-table','warranty_update')">⬇ CSV</button>
            <button class="rpt-action-btn rpt-action-primary" onclick="loadRptWwu()">↺ Refresh</button>
          </div>
        </div>
        <div class="rpt-filter-bar">
          <div class="rpt-filter-group">
            <label>Warranty Status</label>
            <select id="wwu-status" onchange="filterRptTableSelect('wwu-table',this.value,4)">
              <option value="">All</option>
              <option value="Under Warranty">Under Warranty</option>
              <option value="Out of Warranty">Out of Warranty</option>
            </select>
          </div>
          <div class="rpt-filter-group">
            <label>Region</label>
            <select id="wwu-region" onchange="loadRptWwu()">
              <option value="">All Regions</option>
              <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
            </select>
          </div>
          <div class="rpt-filter-group" style="flex:2;">
            <label>Customer</label>
            <input id="wwu-search" type="text" placeholder="Search customer…" oninput="filterRptTable('wwu-table',this.value,[1])">
          </div>
        </div>
        <div class="rpt-table-wrap">
          <table id="wwu-table" class="rpt-table">
            <thead><tr>
              <th>Serial No</th><th>Customer</th><th>Model</th><th>Region</th>
              <th>Warranty Status</th><th>Warranty Type</th><th>Handover Date</th><th>Expiry Date</th><th>Days Remaining</th>
            </tr></thead>
            <tbody id="wwu-tbody"><tr><td colspan="9" class="rpt-loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- ═══════════ END NATIVE REPORT VIEWS ════════════ -->
'''

# Inject before </body>
if '</body>' in content:
    content = content.replace('</body>', RPT_VIEWS_HTML + '\n  </body>', 1)
    print('Report view HTML injected OK')
else:
    print('ERROR: </body> not found')

# ─────────────────────────────────────────────────────────────────────────────
# 2. CSS for the shared report view styles
# ─────────────────────────────────────────────────────────────────────────────
RPT_VIEW_CSS = """
/* ════════════════════════════════════
   NATIVE STANDALONE REPORT VIEWS
   ════════════════════════════════════ */
.rpt-view-wrap {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
.rpt-view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}
.rpt-view-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main, #0f172a);
  margin: 0 0 4px 0;
}
.rpt-view-sub {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}
.rpt-kpi-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #0f172a;
  min-width: 64px;
}
.rpt-kpi-pill span {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}
.rpt-kpi-pill label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
  white-space: nowrap;
  cursor: default;
}
.rpt-action-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.rpt-action-btn:hover { background: #e2e8f0; }
.rpt-action-primary {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}
.rpt-action-primary:hover { background: #dc2626; }
.rpt-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  align-items: flex-end;
}
.rpt-filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 120px;
}
.rpt-filter-group label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.rpt-filter-group input,
.rpt-filter-group select {
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  background: #fff;
  transition: border 0.15s;
}
.rpt-filter-group input:focus,
.rpt-filter-group select:focus { border-color: #ef4444; }
.rpt-table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}
.rpt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.rpt-table thead th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 12px;
  border-bottom: 2px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.rpt-table thead th:hover { color: #ef4444; }
.rpt-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}
.rpt-table tbody tr:hover { background: #f8fafc; }
.rpt-table tbody td {
  padding: 9px 12px;
  color: #334155;
  vertical-align: middle;
}
.rpt-loading {
  text-align: center;
  padding: 60px !important;
  color: #94a3b8;
  font-size: 13px;
}
.rpt-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.rpt-badge-red    { background:#fee2e2; color:#b91c1c; }
.rpt-badge-yellow { background:#fef9c3; color:#a16207; }
.rpt-badge-green  { background:#dcfce7; color:#15803d; }
.rpt-badge-blue   { background:#dbeafe; color:#2563eb; }
.rpt-badge-gray   { background:#f1f5f9; color:#64748b; }
.rpt-row-hidden   { display: none !important; }
/* ══════════════════════════════════ */
"""

# Inject before closing </style> (find the last one before the first <script>)
style_marker = '/* ── FRAPPE REPORT VIEWER ── */'
if style_marker in content:
    content = content.replace(style_marker, RPT_VIEW_CSS + '\n' + style_marker, 1)
    print('Report view CSS injected OK')
else:
    print('ERROR: CSS marker not found')

# ─────────────────────────────────────────────────────────────────────────────
# 3. JAVASCRIPT — data loaders + utilities
# ─────────────────────────────────────────────────────────────────────────────
RPT_JS = """
    // ════════════════════════════════════════════════════════
    //  NATIVE STANDALONE REPORT ENGINE
    //  Data source: Frappe API now → swap fetchReport() for Supabase later
    // ════════════════════════════════════════════════════════

    // ── Shared helpers ───────────────────────────────────────

    function rptBadge(text, cls) {
      return '<span class="rpt-badge rpt-badge-' + cls + '">' + (text || '—') + '</span>';
    }
    function rptEmpty(colspan, msg) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading">' + (msg || 'No data found') + '</td></tr>';
    }
    function rptError(colspan, err) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading" style="color:#ef4444;">Error: ' + (err || 'Failed to load') + '</td></tr>';
    }
    function daysBetween(d1, d2) {
      if (!d1 || !d2) return null;
      return Math.round((new Date(d2) - new Date(d1)) / 86400000);
    }
    function fmtDate(s) {
      if (!s) return '—';
      try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; }
    }

    // ── Column filter (text search) ──────────────────────────
    function filterRptTable(tableId, q, colIdxs) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const ql = (q || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const match = !ql || colIdxs.some(ci => {
          const cell = row.cells[ci];
          return cell && cell.textContent.toLowerCase().includes(ql);
        });
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── Select filter ────────────────────────────────────────
    function filterRptTableSelect(tableId, val, colIdx) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const vl = (val || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const cell = row.cells[colIdx];
        const match = !vl || (cell && cell.textContent.toLowerCase().includes(vl));
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── CSV Export ───────────────────────────────────────────
    function exportRptCsv(tableId, filename) {
      const table = document.getElementById(tableId);
      if (!table) return;
      let csv = '';
      table.querySelectorAll('tr').forEach(row => {
        if (row.classList.contains('rpt-row-hidden')) return;
        const cells = Array.from(row.querySelectorAll('th,td'));
        csv += cells.map(c => '"' + c.textContent.replace(/"/g,'""').trim() + '"').join(',') + '\\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
    }

    // ── Sortable columns ─────────────────────────────────────
    function initRptSort(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return;
      table.querySelectorAll('thead th').forEach((th, idx) => {
        th._sortDir = 1;
        th.addEventListener('click', () => {
          const tbody = table.querySelector('tbody');
          const rows  = Array.from(tbody.querySelectorAll('tr:not(.rpt-row-hidden)'));
          rows.sort((a, b) => {
            const av = (a.cells[idx] || {}).textContent || '';
            const bv = (b.cells[idx] || {}).textContent || '';
            const an = parseFloat(av), bn = parseFloat(bv);
            if (!isNaN(an) && !isNaN(bn)) return (an - bn) * th._sortDir;
            return av.localeCompare(bv) * th._sortDir;
          });
          th._sortDir *= -1;
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    }

    // ════════════════════════════════════════════════════════
    //  1. FT MACHINE REGISTER
    // ════════════════════════════════════════════════════════
    async function loadRptMachineReg() {
      const tbody = document.getElementById('mr2-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = {
          region:           document.getElementById('mr2-region')?.value || '',
          customer:         document.getElementById('mr2-customer')?.value || '',
          model:            document.getElementById('mr2-model')?.value || '',
          warranty_status:  document.getElementById('mr2-warranty-filter')?.value || '',
          status:           document.getElementById('mr2-status-filter')?.value || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const machines = (res?.message?.data) || (Array.isArray(res?.message) ? res.message : []);
        if (!machines.length) { tbody.innerHTML = rptEmpty(10); return; }

        // KPIs
        let active=0, maint=0, warranty=0;
        machines.forEach(m => {
          if (m.status === 'Active') active++;
          if (m.status === 'Under Maintenance') maint++;
          if (m.warranty_status === 'Under Warranty') warranty++;
        });
        document.getElementById('mr2-total').textContent    = machines.length;
        document.getElementById('mr2-active').textContent   = active;
        document.getElementById('mr2-maint').textContent    = maint;
        document.getElementById('mr2-warranty').textContent = warranty;

        const statusBadge = s => {
          if (s === 'Active') return rptBadge(s, 'green');
          if (s === 'Under Maintenance') return rptBadge('Maint.', 'yellow');
          if (s === 'Inactive') return rptBadge(s, 'gray');
          return rptBadge(s, 'gray');
        };
        const wBadge = w => {
          if (w === 'Under Warranty') return rptBadge(w, 'green');
          if (w === 'Out of Warranty') return rptBadge('Out', 'red');
          return rptBadge(w || '—', 'gray');
        };

        tbody.innerHTML = machines.map(m => `
          <tr>
            <td><strong>${m.mxg_fleet_no || '—'}</strong>${m.fleet_no ? '<br><span style="font-size:10px;color:#94a3b8;">Ref: '+m.fleet_no+'</span>':''}</td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td style="text-align:right;font-weight:600;">${m.current_hmr || '—'}</td>
            <td>${m.location || '—'}</td>
            <td>${m.region || '—'}</td>
            <td>${statusBadge(m.status)}</td>
            <td>${wBadge(m.warranty_status)}${m.warranty_expiry?'<br><span style="font-size:10px;color:#94a3b8;">Exp: '+fmtDate(m.warranty_expiry)+'</span>':''}</td>
            <td>${fmtDate(m.commission_date)}</td>
          </tr>`).join('');
        initRptSort('mr2-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  2. MACHINES DUE FOR SERVICE
    // ════════════════════════════════════════════════════════
    async function loadRptDueService() {
      const tbody = document.getElementById('ds-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = { region: document.getElementById('ds-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const all = (res?.message?.data) || [];
        const SERVICE_INTERVAL = 500;
        const WARN_THRESHOLD   = 500;

        const machines = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)    || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            const next = last + SERVICE_INTERVAL;
            const diff = next - cur;
            return { ...m, cur, last, next, diff };
          })
          .filter(m => m.diff <= WARN_THRESHOLD)
          .sort((a, b) => a.diff - b.diff);

        if (!machines.length) { tbody.innerHTML = rptEmpty(10, 'No machines due for service'); return; }

        let overdue=0, soon=0;
        machines.forEach(m => { if (m.diff <= 0) overdue++; else soon++; });
        document.getElementById('ds-overdue').textContent = overdue;
        document.getElementById('ds-soon').textContent    = soon;
        document.getElementById('ds-total').textContent   = machines.length;

        tbody.innerHTML = machines.map(m => {
          const isOverdue = m.diff <= 0;
          const badge = isOverdue
            ? rptBadge('OVERDUE', 'red')
            : rptBadge('Due Soon', 'yellow');
          return `<tr data-urgency="${isOverdue?'overdue':'soon'}">
            <td><strong>${m.mxg_fleet_no || '—'}</strong></td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td>${m.region || '—'}</td>
            <td style="font-weight:700;${isOverdue?'color:#b91c1c':''}">${m.cur}</td>
            <td>${m.last || '—'}</td>
            <td>500 HMR</td>
            <td>${m.next}</td>
            <td>${badge} <span style="font-size:10px;color:${isOverdue?'#b91c1c':'#a16207'};font-weight:700;">${Math.abs(Math.round(m.diff))} HMR ${isOverdue?'overdue':'remaining'}</span></td>
          </tr>`;
        }).join('');
        initRptSort('ds-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    function filterDsUrgency(val) {
      document.querySelectorAll('#ds-tbody tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const urg = row.dataset.urgency || '';
        row.classList.toggle('rpt-row-hidden', val !== '' && urg !== val);
      });
    }

    // ════════════════════════════════════════════════════════
    //  3. GENERAL DEFECTS REPORT (GDR)
    // ════════════════════════════════════════════════════════
    async function loadRptGdr() {
      const tbody = document.getElementById('gdr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(8, 'Loading…');
      try {
        const res  = await callFrappe(FT_DEFECT_SUMMARY_METHOD, {}, 'GET');
        const data = res?.message?.defects || res?.message || [];
        const rows = Array.isArray(data) ? data : [];

        if (!rows.length) { tbody.innerHTML = rptEmpty(8); return; }

        let open=0, prog=0, closed=0;
        rows.forEach(r => {
          const s = (r.status || '').toLowerCase();
          if (s === 'open') open++;
          else if (s === 'in progress') prog++;
          else if (s === 'closed' || s === 'resolved') closed++;
        });
        document.getElementById('gdr-open').textContent     = open;
        document.getElementById('gdr-progress').textContent = prog;
        document.getElementById('gdr-closed').textContent   = closed;

        const priBadge = p => {
          const pc = (p||'').toLowerCase();
          if (pc === 'critical') return rptBadge(p, 'red');
          if (pc === 'high')     return rptBadge(p, 'yellow');
          if (pc === 'medium')   return rptBadge(p, 'blue');
          return rptBadge(p || 'Low', 'gray');
        };
        const stBadge = s => {
          const sc = (s||'').toLowerCase();
          if (sc === 'open')        return rptBadge(s, 'red');
          if (sc === 'in progress') return rptBadge(s, 'yellow');
          if (sc === 'closed' || sc === 'resolved') return rptBadge(s, 'green');
          return rptBadge(s, 'gray');
        };

        const today = new Date();
        tbody.innerHTML = rows.map(r => {
          const days = r.creation ? Math.round((today - new Date(r.creation)) / 86400000) : '—';
          return `<tr>
            <td style="font-family:monospace;font-size:11px;">${r.machine || '—'}</td>
            <td>${r.customer || '—'}</td>
            <td>${r.description || r.defect_description || '—'}</td>
            <td>${priBadge(r.priority)}</td>
            <td>${stBadge(r.status)}</td>
            <td>${r.technician || '—'}</td>
            <td>${fmtDate(r.creation)}</td>
            <td style="font-weight:700;${days>7?'color:#b91c1c':''}">${days}</td>
          </tr>`;
        }).join('');
        initRptSort('gdr-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(8, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  4. SERVICE TRACKING SUMMARY (STS)
    // ════════════════════════════════════════════════════════
    async function loadRptSts() {
      const tbody = document.getElementById('sts-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(7, 'Loading…');
      try {
        const from = document.getElementById('sts-from')?.value || '';
        const to   = document.getElementById('sts-to')?.value   || '';
        const res  = await callFrappe(FT_GET_SERVICE_PLAN_LIST_METHOD,
          { from_date: from, to_date: to }, 'GET');
        const rows = res?.message?.plans || res?.message || [];
        const data = Array.isArray(rows) ? rows : [];

        if (!data.length) { tbody.innerHTML = rptEmpty(7); return; }

        let planned=0, inprog=0, completed=0;
        data.forEach(r => {
          const s = (r.status || '').toLowerCase();
          if (s === 'planned')     planned++;
          if (s === 'in progress') inprog++;
          if (s === 'completed')   completed++;
        });
        document.getElementById('sts-planned').textContent    = planned;
        document.getElementById('sts-inprogress').textContent = inprog;
        document.getElementById('sts-completed').textContent  = completed;

        const stBadge = s => {
          const sc = (s||'').toLowerCase();
          if (sc==='planned')     return rptBadge(s,'blue');
          if (sc==='in progress') return rptBadge(s,'yellow');
          if (sc==='completed')   return rptBadge(s,'green');
          return rptBadge(s,'gray');
        };

        tbody.innerHTML = data.map(r => `<tr>
          <td>${r.customer || '—'}</td>
          <td style="font-family:monospace;font-size:11px;">${r.machine || '—'}</td>
          <td>${r.description || '—'}</td>
          <td>${r.technician || '—'}</td>
          <td>${fmtDate(r.scheduled_date || r.date)}</td>
          <td>${stBadge(r.status)}</td>
          <td>${r.location || '—'}</td>
        </tr>`).join('');
        initRptSort('sts-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(7, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  5. WSD DAILY BREAKDOWN REPORT
    // ════════════════════════════════════════════════════════
    async function loadRptWbd() {
      const tbody = document.getElementById('wbd-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(8, 'Loading…');
      try {
        const from = document.getElementById('wbd-from')?.value || '';
        const to   = document.getElementById('wbd-to')?.value   || '';
        const res  = await callFrappe(FT_BREAKDOWN_DBR_METHOD,
          { from_date: from, to_date: to, responsibility: 'WSD' }, 'GET');
        const rows = res?.message?.breakdowns || res?.message || [];
        const data = Array.isArray(rows) ? rows : [];

        if (!data.length) { tbody.innerHTML = rptEmpty(8); return; }

        let open=0, prog=0;
        data.forEach(r => {
          const s=(r.status||'').toLowerCase();
          if (s==='open') open++;
          if (s==='in progress') prog++;
        });
        document.getElementById('wbd-open').textContent     = open;
        document.getElementById('wbd-progress').textContent = prog;
        document.getElementById('wbd-total').textContent    = data.length;

        const stBadge = s => {
          const sc=(s||'').toLowerCase();
          if (sc==='open') return rptBadge(s,'red');
          if (sc==='in progress') return rptBadge(s,'yellow');
          if (sc==='parts on order') return rptBadge(s,'blue');
          if (sc==='closed') return rptBadge(s,'green');
          return rptBadge(s,'gray');
        };
        const today = new Date();
        tbody.innerHTML = data.map(r => {
          const days = r.creation ? Math.round((today-new Date(r.creation))/86400000) : '—';
          return `<tr>
            <td>${r.customer||'—'}</td>
            <td>${r.model||'—'}</td>
            <td style="font-family:monospace;font-size:11px;">${r.machine||r.name||'—'}</td>
            <td>${r.description||'—'}</td>
            <td>${stBadge(r.status)}</td>
            <td>${r.technician||'—'}</td>
            <td>${fmtDate(r.creation)}</td>
            <td style="font-weight:700;${days>7?'color:#b91c1c':''}">${days}</td>
          </tr>`;
        }).join('');
        initRptSort('wbd-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(8, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  6. MAINTENANCE WARNING REPORT (MWR)
    // ════════════════════════════════════════════════════════
    async function loadRptMwr() {
      const tbody = document.getElementById('mwr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('mwr-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const all = res?.message?.data || [];
        const CRITICAL = 1000;
        const WARNING  = 750;

        const machines = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)     || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            const since = cur - last;
            return { ...m, cur, last, since };
          })
          .filter(m => m.since >= WARNING)
          .sort((a, b) => b.since - a.since);

        if (!machines.length) { tbody.innerHTML = rptEmpty(9, 'No maintenance warnings'); return; }

        let critical=0, warning=0;
        machines.forEach(m => { if(m.since>=CRITICAL) critical++; else warning++; });
        document.getElementById('mwr-critical').textContent = critical;
        document.getElementById('mwr-warning').textContent  = warning;
        document.getElementById('mwr-total').textContent    = machines.length;

        tbody.innerHTML = machines.map(m => {
          const isCrit = m.since >= CRITICAL;
          const badge  = isCrit ? rptBadge('CRITICAL','red') : rptBadge('WARNING','yellow');
          return `<tr>
            <td><strong>${m.mxg_fleet_no||'—'}</strong></td>
            <td>${m.customer||'—'}</td>
            <td>${m.model||'—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
            <td>${m.region||'—'}</td>
            <td style="font-weight:600;">${m.cur}</td>
            <td>${m.last||'—'}</td>
            <td style="font-weight:700;color:${isCrit?'#b91c1c':'#a16207'};">${Math.round(m.since)} HMR</td>
            <td>${badge}</td>
          </tr>`;
        }).join('');
        initRptSort('mwr-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  7. WEEKLY WARRANTY UPDATE (WWU)
    // ════════════════════════════════════════════════════════
    async function loadRptWwu() {
      const tbody = document.getElementById('wwu-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('wwu-region')?.value || '' };
        const res  = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const all  = res?.message?.data || [];
        const rows = all.filter(m => m.warranty_status);

        if (!rows.length) { tbody.innerHTML = rptEmpty(9); return; }

        const today = new Date();
        let active=0, expired=0, expiring=0;
        rows.forEach(m => {
          const ws = (m.warranty_status||'').toLowerCase();
          if (ws === 'under warranty') {
            active++;
            const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
            if (expiry) {
              const daysLeft = Math.round((expiry - today) / 86400000);
              if (daysLeft < 90) expiring++;
            }
          } else { expired++; }
        });
        document.getElementById('wwu-active').textContent   = active;
        document.getElementById('wwu-expired').textContent  = expired;
        document.getElementById('wwu-expiring').textContent = expiring;

        tbody.innerHTML = rows.map(m => {
          const ws = (m.warranty_status||'').toLowerCase();
          const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
          const daysLeft = expiry ? Math.round((expiry - today) / 86400000) : null;
          const wBadge = ws === 'under warranty'
            ? rptBadge('Under Warranty','green')
            : rptBadge('Out','red');
          const daysCell = daysLeft !== null
            ? `<span style="font-weight:700;color:${daysLeft<0?'#b91c1c':daysLeft<90?'#a16207':'#15803d'};">${daysLeft<0?Math.abs(daysLeft)+' days ago':daysLeft+' days'}</span>`
            : '—';
          return `<tr>
            <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
            <td>${m.customer||'—'}</td>
            <td>${m.model||'—'}</td>
            <td>${m.region||'—'}</td>
            <td>${wBadge}</td>
            <td>${m.warranty_type||'—'}</td>
            <td>${fmtDate(m.commission_date)}</td>
            <td>${fmtDate(m.warranty_expiry)}</td>
            <td>${daysCell}</td>
          </tr>`;
        }).join('');
        initRptSort('wwu-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  END NATIVE REPORT ENGINE
    // ════════════════════════════════════════════════════════
"""

# Inject JS before the closing </script> just before </body>
# Find the last </script> tag
last_script_end = content.rfind('</script>')
if last_script_end != -1:
    content = content[:last_script_end] + RPT_JS + '\n    </script>' + content[last_script_end+9:]
    print('Report JS injected OK')
else:
    print('ERROR: </script> not found')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Wire showView() to auto-load native reports
# ─────────────────────────────────────────────────────────────────────────────
OLD_SHOW_VIEW = """        if (viewId === 'view-archives') loadReportArchives();
        if (viewId === 'view-reports') loadDailyBreakdownReport();
        if (viewId === 'view-defects') loadFtDefects();
        if (viewId === 'view-machines') loadFtMachineRegister();
        if (viewId === 'view-fsi') loadFieldServicePlan();"""

NEW_SHOW_VIEW = """        if (viewId === 'view-archives')        loadReportArchives();
        if (viewId === 'view-reports')         loadDailyBreakdownReport();
        if (viewId === 'view-defects')         loadFtDefects();
        if (viewId === 'view-machines')        loadFtMachineRegister();
        if (viewId === 'view-fsi')             loadFieldServicePlan();
        // Native standalone reports
        if (viewId === 'view-rpt-machine-reg') loadRptMachineReg();
        if (viewId === 'view-rpt-due-service') loadRptDueService();
        if (viewId === 'view-rpt-gdr')         loadRptGdr();
        if (viewId === 'view-rpt-sts')         loadRptSts();
        if (viewId === 'view-rpt-wbd')         loadRptWbd();
        if (viewId === 'view-rpt-mwr')         loadRptMwr();
        if (viewId === 'view-rpt-wwu')         loadRptWwu();"""

if OLD_SHOW_VIEW in content:
    content = content.replace(OLD_SHOW_VIEW, NEW_SHOW_VIEW, 1)
    print('showView() wired OK')
else:
    print('ERROR: showView marker not found')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Update Reports Hub cards to navigate to native views
# ─────────────────────────────────────────────────────────────────────────────
REPORT_CARD_MAP = {
    "openNativeReport('ft_machine_register','FT Machine Register')":
        "showView('view-rpt-machine-reg');closeAllDropdowns();",
    "openNativeReport('machines_due_for_service','Machines Due for Service')":
        "showView('view-rpt-due-service');closeAllDropdowns();",
    "openNativeReport('general_defects_report_(gdr)','General Defects Report (GDR)')":
        "showView('view-rpt-gdr');closeAllDropdowns();",
    "openNativeReport('service_tracking_summary_(sts)','Service Tracking Summary (STS)')":
        "showView('view-rpt-sts');closeAllDropdowns();",
    "openNativeReport('wsd_daily_breakdown_report','WSD Daily Breakdown Report')":
        "showView('view-rpt-wbd');closeAllDropdowns();",
    "openNativeReport('ft_maintenance_warning_report_mwr','FT Maintenance Warning Report (MWR)')":
        "showView('view-rpt-mwr');closeAllDropdowns();",
    "openNativeReport('weekly_warranty_update_(wwu)','Weekly Warranty Update (WWU)')":
        "showView('view-rpt-wwu');closeAllDropdowns();",
}

replaced = 0
for old, new in REPORT_CARD_MAP.items():
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        replaced += count
        print(f'  Card wired: {old[:55]}… ({count}x)')
    else:
        print(f'  WARN: not found: {old[:55]}')
print(f'Total card rewires: {replaced}')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Also set default date filters for date-range reports
# ─────────────────────────────────────────────────────────────────────────────
# This is handled at runtime in showView via the load functions

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('File saved OK')
