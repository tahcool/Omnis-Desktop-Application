"""
Replace the top of view-reports with a proper Reports Hub page.
The existing DBR table content stays below - we prepend a report catalogue above it.
Also defines window.openNativeReport to open reports in an embedded iframe modal.
"""

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── 1. Replace the view-reports outer wrapper opening with full hub HTML ──────
OLD_REPORTS_HEADER = """      <!-- REPORTS VIEW -->
      <div id="view-reports" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->"""

NEW_REPORTS_HUB = """      <!-- REPORTS VIEW -->
      <div id="view-reports" class="view-page hidden">

        <!-- ══ REPORTS HUB ══ -->
        <div id="rpt-hub" style="margin-bottom:24px;">
          <!-- Hub Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="font-size:20px; font-weight:800; color:#0f172a; margin:0 0 4px 0;">Fleetrack Reports</h2>
              <p style="font-size:12px; color:#64748b; margin:0;">Open any Frappe report directly in the dashboard.</p>
            </div>
            <input id="rpt-search" type="text" placeholder="🔍  Search reports…"
              oninput="filterReportCards(this.value)"
              style="padding:9px 14px; border:1px solid #e2e8f0; border-radius:10px; font-size:13px;
                     width:240px; outline:none; background:#f8fafc; transition:border 0.2s;"
              onfocus="this.style.borderColor='#ef4444'" onblur="this.style.borderColor='#e2e8f0'">
          </div>

          <!-- Category Groups -->
          <div id="rpt-grid-wrap">

            <!-- Breakdowns -->
            <div class="rpt-category" data-cat="breakdowns">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Breakdowns</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="daily_breakdown_report_(dbr)" data-label="Daily Breakdown Report (DBR)"
                  onclick="openNativeReport('daily_breakdown_report_(dbr)','Daily Breakdown Report (DBR)')">
                  <div class="rpt-icon" style="background:#fee2e2; color:#ef4444;">📋</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Daily Breakdown Report</div>
                    <div class="rpt-badge">DBR</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="fsd_daily_breakdown_report" data-label="FSD Daily Breakdown Report"
                  onclick="openNativeReport('fsd_daily_breakdown_report','FSD Daily Breakdown Report')">
                  <div class="rpt-icon" style="background:#fee2e2; color:#ef4444;">📋</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">FSD Daily Breakdown Report</div>
                    <div class="rpt-badge">FSD</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="wsd_daily_breakdown_report" data-label="WSD Daily Breakdown Report"
                  onclick="openNativeReport('wsd_daily_breakdown_report','WSD Daily Breakdown Report')">
                  <div class="rpt-icon" style="background:#fee2e2; color:#ef4444;">📋</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">WSD Daily Breakdown Report</div>
                    <div class="rpt-badge">WSD</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="rdr" data-label="RDR"
                  onclick="openNativeReport('rdr','RDR')">
                  <div class="rpt-icon" style="background:#fee2e2; color:#ef4444;">📋</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">RDR</div>
                    <div class="rpt-badge">RDR</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fleet & Machines -->
            <div class="rpt-category" data-cat="fleet" style="margin-top:20px;">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Fleet &amp; Machines</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="ft_machine_register" data-label="FT Machine Register"
                  onclick="openNativeReport('ft_machine_register','FT Machine Register')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">🚜</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">FT Machine Register</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Register</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="equipment_population_register" data-label="Equipment Population Register"
                  onclick="openNativeReport('equipment_population_register','Equipment Population Register')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">🚜</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Equipment Population Register</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Register</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="general_population_register" data-label="General Population Register"
                  onclick="openNativeReport('general_population_register','General Population Register')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">🚜</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">General Population Register</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Register</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="fleetrack_machine_summary" data-label="Fleetrack Machine Summary"
                  onclick="openNativeReport('fleetrack_machine_summary','Fleetrack Machine Summary')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">📊</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Fleetrack Machine Summary</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Summary</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="fleetrack_managed" data-label="Fleetrack Managed"
                  onclick="openNativeReport('fleetrack_managed','Fleetrack Managed')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">📊</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Fleetrack Managed</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Fleet</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="fleetrack_activity_list" data-label="Fleetrack Activity List"
                  onclick="openNativeReport('fleetrack_activity_list','Fleetrack Activity List')">
                  <div class="rpt-icon" style="background:#dbeafe; color:#2563eb;">📋</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Fleetrack Activity List</div>
                    <div class="rpt-badge" style="background:#eff6ff; color:#2563eb;">Activity</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Maintenance & Service -->
            <div class="rpt-category" data-cat="service" style="margin-top:20px;">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Maintenance &amp; Service</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="ft_maintenance_warning_report_mwr" data-label="FT Maintenance Warning Report (MWR)"
                  onclick="openNativeReport('ft_maintenance_warning_report_mwr','FT Maintenance Warning Report (MWR)')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">⚠️</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Maintenance Warning Report</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">MWR</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="machines_due_for_service" data-label="Machines Due for Service"
                  onclick="openNativeReport('machines_due_for_service','Machines Due for Service')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">🔧</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Machines Due for Service</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">Service</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="service_tracking_summary_(sts)" data-label="Service Tracking Summary (STS)"
                  onclick="openNativeReport('service_tracking_summary_(sts)','Service Tracking Summary (STS)')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">📊</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Service Tracking Summary</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">STS</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="field_service_planner" data-label="Field Service Planner"
                  onclick="openNativeReport('field_service_planner','Field Service Planner')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">📅</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Field Service Planner</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">FSP</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="workshop_planner" data-label="Workshop Planner"
                  onclick="openNativeReport('workshop_planner','Workshop Planner')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">🏭</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Workshop Planner</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">Workshop</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="jobs_to_complete" data-label="Jobs To Complete"
                  onclick="openNativeReport('jobs_to_complete','Jobs To Complete')">
                  <div class="rpt-icon" style="background:#fef3c7; color:#d97706;">✅</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Jobs To Complete</div>
                    <div class="rpt-badge" style="background:#fffbeb; color:#d97706;">Jobs</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Defects & Quality -->
            <div class="rpt-category" data-cat="defects" style="margin-top:20px;">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Defects &amp; Quality</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="general_defects_report_(gdr)" data-label="General Defects Report (GDR)"
                  onclick="openNativeReport('general_defects_report_(gdr)','General Defects Report (GDR)')">
                  <div class="rpt-icon" style="background:#fce7f3; color:#db2777;">🔴</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">General Defects Report</div>
                    <div class="rpt-badge" style="background:#fdf2f8; color:#db2777;">GDR</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="major_defects_report_(mdr)" data-label="Major Defects Report (MDR)"
                  onclick="openNativeReport('major_defects_report_(mdr)','Major Defects Report (MDR)')">
                  <div class="rpt-icon" style="background:#fce7f3; color:#db2777;">🚨</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Major Defects Report</div>
                    <div class="rpt-badge" style="background:#fdf2f8; color:#db2777;">MDR</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Warranty & Sales -->
            <div class="rpt-category" data-cat="warranty" style="margin-top:20px;">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Warranty &amp; Sales</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="weekly_warranty_update_(wwu)" data-label="Weekly Warranty Update (WWU)"
                  onclick="openNativeReport('weekly_warranty_update_(wwu)','Weekly Warranty Update (WWU)')">
                  <div class="rpt-icon" style="background:#d1fae5; color:#059669;">🛡️</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Weekly Warranty Update</div>
                    <div class="rpt-badge" style="background:#ecfdf5; color:#059669;">WWU</div>
                  </div>
                </div>
                <div class="rpt-card" data-key="lost_sales_report_(lsr)" data-label="Lost Sales Report (LSR)"
                  onclick="openNativeReport('lost_sales_report_(lsr)','Lost Sales Report (LSR)')">
                  <div class="rpt-icon" style="background:#d1fae5; color:#059669;">📉</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Lost Sales Report</div>
                    <div class="rpt-badge" style="background:#ecfdf5; color:#059669;">LSR</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Telematics -->
            <div class="rpt-category" data-cat="telematics" style="margin-top:20px;">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;
                          letter-spacing:1px; margin-bottom:10px; padding-bottom:6px;
                          border-bottom:2px solid #f1f5f9;">Telematics</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px;">
                <div class="rpt-card" data-key="telematics_alert_report_(tar)" data-label="Telematics Alert Report (TAR)"
                  onclick="openNativeReport('telematics_alert_report_(tar)','Telematics Alert Report (TAR)')">
                  <div class="rpt-icon" style="background:#ede9fe; color:#7c3aed;">📡</div>
                  <div class="rpt-card-body">
                    <div class="rpt-name">Telematics Alert Report</div>
                    <div class="rpt-badge" style="background:#f5f3ff; color:#7c3aed;">TAR</div>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- /rpt-grid-wrap -->
        </div><!-- /rpt-hub -->

        <!-- ══ EXISTING DBR TABLE (kept intact below) ══ -->
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->"""

if OLD_REPORTS_HEADER in content:
    content = content.replace(OLD_REPORTS_HEADER, NEW_REPORTS_HUB, 1)
    print("✅ Reports hub HTML injected")
else:
    print("❌ Old header not found — check whitespace")

# ── 2. Add Report Hub CSS (before </style> near end of <head>) ──────────────
OLD_STYLE_MARKER = "/* HMR Activity Report modal open state"
RPT_CSS = """/* ── REPORT HUB CARDS ── */
.rpt-card {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px;
  border-radius:10px;
  border:1px solid #e2e8f0;
  background:#fff;
  cursor:pointer;
  transition:box-shadow 0.15s, transform 0.15s, border-color 0.15s;
}
.rpt-card:hover {
  box-shadow:0 4px 14px rgba(0,0,0,0.10);
  border-color:#ef4444;
  transform:translateY(-1px);
}
.rpt-icon {
  font-size:18px;
  width:36px; height:36px;
  border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.rpt-card-body { flex:1; min-width:0; }
.rpt-name { font-size:12px; font-weight:700; color:#1e293b; line-height:1.3; }
.rpt-badge {
  display:inline-block; margin-top:3px;
  font-size:9px; font-weight:800; text-transform:uppercase;
  padding:1px 6px; border-radius:999px;
  background:#fee2e2; color:#ef4444;
  letter-spacing:0.5px;
}
.rpt-card.rpt-hidden { display:none !important; }
/* ── END REPORT HUB CARDS ── */

/* HMR Activity Report modal open state"""

if OLD_STYLE_MARKER in content:
    content = content.replace(OLD_STYLE_MARKER, RPT_CSS, 1)
    print("✅ Report hub CSS injected")
else:
    print("❌ CSS marker not found")

# ── 3. Add openNativeReport JS function ─────────────────────────────────────
OLD_JS_MARKER = "const FLEET_BASE_URL = (window.location.origin === 'null' || window.location.origin.startsWith('file'))"
RPT_JS = """// ── REPORT HUB FUNCTIONS ──────────────────────────────────────
    function openNativeReport(reportKey, reportTitle) {
      const base = (window.location.origin === 'null' || window.location.origin.startsWith('file'))
        ? 'https://fleetrack.machinery-exchange.com'
        : window.location.origin;
      const url = base + '/app/query-report/' + encodeURIComponent(
        reportKey.replace(/_/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
          .replace(/\\(Dbr\\)/, '(DBR)').replace(/\\(Gdr\\)/, '(GDR)')
          .replace(/\\(Mdr\\)/, '(MDR)').replace(/\\(Mwr\\)/, '(MWR)')
          .replace(/\\(Lsr\\)/, '(LSR)').replace(/\\(Wwu\\)/, '(WWU)')
          .replace(/\\(Sts\\)/, '(STS)').replace(/\\(Tar\\)/, '(TAR)')
          .replace(/\\(Fsd\\)/, '').replace(/Rdr/, 'RDR')
          .trim()
      );
      // Open in a native window via Electron IPC (or browser tab as fallback)
      if (window.electron && window.electron.openExternal) {
        window.electron.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }

    function filterReportCards(q) {
      const ql = (q || '').toLowerCase().trim();
      document.querySelectorAll('.rpt-card').forEach(card => {
        const label = (card.dataset.label || '').toLowerCase();
        card.classList.toggle('rpt-hidden', ql !== '' && !label.includes(ql));
      });
      // Hide empty category headers
      document.querySelectorAll('.rpt-category').forEach(cat => {
        const visible = cat.querySelectorAll('.rpt-card:not(.rpt-hidden)').length;
        cat.style.display = visible ? '' : 'none';
      });
    }
    // ── END REPORT HUB FUNCTIONS ──────────────────────────────

    const FLEET_BASE_URL = (window.location.origin === 'null' || window.location.origin.startsWith('file'))"""

if OLD_JS_MARKER in content:
    content = content.replace(OLD_JS_MARKER, RPT_JS, 1)
    print("✅ Report hub JS injected")
else:
    print("❌ JS marker not found")

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print("✅ File saved")
