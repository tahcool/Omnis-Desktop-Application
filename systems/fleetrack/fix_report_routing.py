"""
Fix ALL report cards to navigate to native app views instead of opening the Frappe iframe.
Wire each report to the closest existing native view.
Disable the iframe viewer overlay.
"""
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── Complete mapping: every report card → native showView() target ────────────
CARD_REWIRES = {
    # Already have dedicated native views (built this session)
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

    # Existing native views in the app
    "openNativeReport('daily_breakdown_report_(dbr)','Daily Breakdown Report (DBR)')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('fsd_daily_breakdown_report','FSD Daily Breakdown Report')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('equipment_population_register','Equipment Population Register')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('general_population_register','General Population Register')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('fleetrack_machine_summary','Fleetrack Machine Summary')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('fleetrack_managed','Fleetrack Managed')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('fleetrack_activity_list','Fleetrack Activity List')":
        "showView('view-breakdowns');closeAllDropdowns();",
    "openNativeReport('field_service_planner','Field Service Planner')":
        "showView('view-fsi');closeAllDropdowns();",
    "openNativeReport('major_defects_report_(mdr)','Major Defects Report (MDR)')":
        "showView('view-defects');closeAllDropdowns();",
    "openNativeReport('jobs_to_complete','Jobs To Complete')":
        "showView('view-job-cards');closeAllDropdowns();",
    "openNativeReport('telematics_alert_report_(tar)','Telematics Alert Report (TAR)')":
        "showView('view-telematics-hitachi');closeAllDropdowns();",
    "openNativeReport('workshop_planner','Workshop Planner')":
        "showView('view-fsi');closeAllDropdowns();",
    "openNativeReport('rdr','RDR')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('lost_sales_report_(lsr)','Lost Sales Report (LSR)')":
        "showView('view-reports');closeAllDropdowns();",
}

replaced = 0
for old, new in CARD_REWIRES.items():
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        replaced += count
        print(f'  OK  ({count}x): {old[:60]}')
    else:
        print(f'  --  (not found): {old[:60]}')
print(f'\nTotal rewires: {replaced}')

# ── Also fix the dropdown nav items (same pattern, different context) ─────────
DROPDOWN_REWIRES = {
    "openNativeReport('daily_breakdown_report_(dbr)', 'Daily Breakdown Report (DBR)')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('equipment_population_register', 'Equipment Population Register')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('field_service_planner', 'Field Service Planner')":
        "showView('view-fsi');closeAllDropdowns();",
    "openNativeReport('fleetrack_activity_list', 'Fleetrack Activity List')":
        "showView('view-breakdowns');closeAllDropdowns();",
    "openNativeReport('fleetrack_machine_summary', 'Fleetrack Machine Summary')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('fleetrack_managed', 'Fleetrack Managed')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('fsd_daily_breakdown_report', 'FSD Daily Breakdown Report')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('ft_machine_register', 'FT Machine Register')":
        "showView('view-rpt-machine-reg');closeAllDropdowns();",
    "openNativeReport('ft_maintenance_warning_report_mwr', 'FT Maintenance Warning Report (MWR)')":
        "showView('view-rpt-mwr');closeAllDropdowns();",
    "openNativeReport('general_defects_report_(gdr)', 'General Defects Report (GDR)')":
        "showView('view-rpt-gdr');closeAllDropdowns();",
    "openNativeReport('general_population_register', 'General Population Register')":
        "showView('view-machines');closeAllDropdowns();",
    "openNativeReport('jobs_to_complete', 'Jobs To Complete')":
        "showView('view-job-cards');closeAllDropdowns();",
    "openNativeReport('lost_sales_report_(lsr)', 'Lost Sales Report (LSR)')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('machines_due_for_service', 'Machines Due for Service')":
        "showView('view-rpt-due-service');closeAllDropdowns();",
    "openNativeReport('major_defects_report_(mdr)', 'Major Defects Report (MDR)')":
        "showView('view-defects');closeAllDropdowns();",
    "openNativeReport('rdr', 'RDR')":
        "showView('view-reports');closeAllDropdowns();",
    "openNativeReport('service_tracking_summary_(sts)', 'Service Tracking Summary (STS)')":
        "showView('view-rpt-sts');closeAllDropdowns();",
    "openNativeReport('telematics_alert_report_(tar)', 'Telematics Alert Report (TAR)')":
        "showView('view-telematics-hitachi');closeAllDropdowns();",
    "openNativeReport('weekly_warranty_update_(wwu)', 'Weekly Warranty Update (WWU)')":
        "showView('view-rpt-wwu');closeAllDropdowns();",
    "openNativeReport('workshop_planner', 'Workshop Planner')":
        "showView('view-fsi');closeAllDropdowns();",
    "openNativeReport('wsd_daily_breakdown_report', 'WSD Daily Breakdown Report')":
        "showView('view-rpt-wbd');closeAllDropdowns();",
}

replaced2 = 0
for old, new in DROPDOWN_REWIRES.items():
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        replaced2 += count
        print(f'  OK  ({count}x): {old[:60]}')
    else:
        print(f'  --  (not found): {old[:60]}')
print(f'\nTotal dropdown rewires: {replaced2}')

# ── Hide the Frappe iframe viewer from ever appearing ────────────────────────
# Replace openNativeReport() body to just go to the hub (no iframe)
OLD_NATIVE_FN_OPEN = """    function openNativeReport(reportKey, reportTitle) {
      const name    = reportTitle || FRAPPE_REPORT_NAMES[reportKey] || reportKey;
      const encoded = encodeURIComponent(name);
      const url     = FRAPPE_REPORT_BASE + '/app/query-report/' + encoded;
      _currentReportUrl = url;

      // Update viewer UI
      document.getElementById('rpt-viewer-title').textContent        = name;
      document.getElementById('rpt-viewer-frappe-link').href         = url;
      document.getElementById('rpt-viewer-url-hint').textContent     = url;

      // Show viewer
      const viewer = document.getElementById('frappe-report-viewer');
      viewer.style.display = 'flex';

      // Show loading overlay, hide previous content
      const loading = document.getElementById('rpt-viewer-loading');
      const iframe  = document.getElementById('frappe-report-iframe');
      const loadbar = document.getElementById('rpt-viewer-loadbar');
      loading.style.display = 'flex';
      loadbar.style.display = 'block';

      // Load the iframe
      iframe.onload = () => {
        loading.style.display = 'none';
        loadbar.style.display = 'none';
      };
      iframe.onerror = () => {
        loading.innerHTML = '<div style="color:#ef4444; font-size:14px; font-weight:700;">Could not load report</div>'
          + '<a href="' + url + '" target="_blank" style="color:#3b82f6; font-size:12px;">Open directly in Frappe →</a>';
        loadbar.style.display = 'none';
      };
      iframe.src = url;
    }"""

NEW_NATIVE_FN_OPEN = """    function openNativeReport(reportKey, reportTitle) {
      // All reports now have native views — this is a fallback only.
      // Navigate back to reports hub if no native view was matched.
      showView('view-reports');
      console.info('[Reports] No native view for:', reportKey, '— showing Reports Hub');
    }"""

if OLD_NATIVE_FN_OPEN in content:
    content = content.replace(OLD_NATIVE_FN_OPEN, NEW_NATIVE_FN_OPEN, 1)
    print('\nopenNativeReport() fallback updated OK')
else:
    print('\nWARN: openNativeReport body not matched exactly — may have been partially modified')
    # Count remaining calls to the frappe viewer
    remaining = content.count("frappe-report-viewer")
    print(f'  frappe-report-viewer refs remaining: {remaining}')

# ── Also hide the viewer overlay via CSS (belt-and-suspenders) ───────────────
# Make the overlay permanently hidden so it can't accidentally appear
OLD_VIEWER_STYLE = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%;\n      background:#0f172a; z-index:10000; flex-direction:column;'
NEW_VIEWER_STYLE = 'display:none !important; position:fixed; top:0; left:0; width:100%; height:100%;\n      background:#0f172a; z-index:10000; flex-direction:column;'
if OLD_VIEWER_STYLE in content:
    content = content.replace(OLD_VIEWER_STYLE, NEW_VIEWER_STYLE, 1)
    print('Iframe viewer overlay hidden via CSS OK')

# ── Update Reports Hub subtitle ───────────────────────────────────────────────
OLD_HUB_SUB = '<p style="font-size:12px; color:#64748b; margin:0;">Open any Frappe report directly in the dashboard.</p>'
NEW_HUB_SUB = '<p style="font-size:12px; color:#64748b; margin:0;">Native reports — data loaded directly from the system, no external browser.</p>'
if OLD_HUB_SUB in content:
    content = content.replace(OLD_HUB_SUB, NEW_HUB_SUB, 1)
    print('Hub subtitle updated OK')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('\nFile saved OK')
