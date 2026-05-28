"""
Inject in-app Frappe Report Viewer:
1. Add a full-screen report viewer overlay div (after pdf-preview-modal)
2. Update openNativeReport() to use the in-app viewer instead of window.open
3. Add CSS for the viewer
"""
import io, sys

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── 1. Add viewer HTML after the pdf-preview-modal closing tag ───────────────
OLD_AFTER_PDF = '    <!-- SIGNATURE MODAL -->'

VIEWER_HTML = '''    <!-- IN-APP FRAPPE REPORT VIEWER -->
    <div id="frappe-report-viewer" style="
      display:none; position:fixed; top:0; left:0; width:100%; height:100%;
      background:#0f172a; z-index:10000; flex-direction:column;">

      <!-- Viewer Topbar -->
      <div style="
        height:52px; background:#1e293b; border-bottom:1px solid #334155;
        display:flex; align-items:center; padding:0 16px; gap:12px; flex-shrink:0;">

        <!-- Back button -->
        <button onclick="closeReportViewer()"
          style="background:#334155; color:#e2e8f0; border:none; padding:7px 14px;
                 border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;
                 display:flex; align-items:center; gap:6px; transition:background 0.15s;"
          onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Reports
        </button>

        <!-- Breadcrumb -->
        <div style="color:#64748b; font-size:12px;">Reports</div>
        <div style="color:#475569;">/</div>
        <div id="rpt-viewer-title" style="color:#f1f5f9; font-size:13px; font-weight:700;
             white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:400px;">
          Report
        </div>

        <div style="flex:1;"></div>

        <!-- Refresh -->
        <button onclick="refreshReportViewer()"
          style="background:transparent; color:#94a3b8; border:1px solid #334155; padding:6px 12px;
                 border-radius:8px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:5px;"
          onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>

        <!-- Open in Frappe -->
        <a id="rpt-viewer-frappe-link" href="#" target="_blank"
          style="background:#ef4444; color:#fff; border:none; padding:6px 14px;
                 border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;
                 text-decoration:none; display:flex; align-items:center; gap:5px;"
          onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in Frappe
        </a>
      </div>

      <!-- Loading bar -->
      <div id="rpt-viewer-loadbar" style="
        height:3px; background:#ef4444;
        animation: rptLoadSlide 1.4s ease-in-out infinite;
        display:none;">
      </div>

      <!-- iframe fills remaining height -->
      <div style="flex:1; position:relative; background:#f8fafc;">
        <iframe id="frappe-report-iframe"
          src=""
          style="width:100%; height:100%; border:none; display:block;"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads">
        </iframe>

        <!-- Loading overlay -->
        <div id="rpt-viewer-loading" style="
          position:absolute; inset:0; background:#f8fafc;
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
          <div style="width:44px; height:44px; border:3px solid #e2e8f0;
                      border-top-color:#ef4444; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <div style="font-size:13px; color:#64748b; font-weight:600;">Loading report from Frappe…</div>
          <div id="rpt-viewer-url-hint" style="font-size:10px; color:#94a3b8; max-width:500px; text-align:center; word-break:break-all;"></div>
        </div>
      </div>
    </div>
    <!-- END IN-APP FRAPPE REPORT VIEWER -->

    <!-- SIGNATURE MODAL -->'''

if OLD_AFTER_PDF in content:
    content = content.replace(OLD_AFTER_PDF, VIEWER_HTML, 1)
    print('HTML injected OK')
else:
    print('ERROR: HTML marker not found')

# ── 2. Replace openNativeReport() JS ────────────────────────────────────────
OLD_NATIVE_RPT_FN = """// ── REPORT HUB FUNCTIONS ──────────────────────────────────────
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
    }"""

NEW_NATIVE_RPT_FN = """// ── REPORT HUB FUNCTIONS ──────────────────────────────────────
    const FRAPPE_REPORT_BASE = 'https://fleetrack.machinery-exchange.com';

    // Map report keys to their exact Frappe report names
    const FRAPPE_REPORT_NAMES = {
      'daily_breakdown_report_(dbr)':            'Daily Breakdown Report (DBR)',
      'equipment_population_register':           'Equipment Population Register',
      'field_service_planner':                   'Field Service Planner',
      'fleetrack_activity_list':                 'Fleetrack Activity List',
      'fleetrack_machine_summary':               'Fleetrack Machine Summary',
      'fleetrack_managed':                       'Fleetrack Managed',
      'fsd_daily_breakdown_report':              'FSD Daily Breakdown Report',
      'ft_machine_register':                     'FT Machine Register',
      'ft_maintenance_warning_report_mwr':       'FT Maintenance Warning Report (MWR)',
      'general_defects_report_(gdr)':            'General Defects Report (GDR)',
      'general_population_register':             'General Population Register',
      'jobs_to_complete':                        'Jobs To Complete',
      'lost_sales_report_(lsr)':                 'Lost Sales Report (LSR)',
      'machines_due_for_service':                'Machines Due for Service',
      'major_defects_report_(mdr)':              'Major Defects Report (MDR)',
      'rdr':                                     'RDR',
      'service_tracking_summary_(sts)':          'Service Tracking Summary (STS)',
      'telematics_alert_report_(tar)':           'Telematics Alert Report (TAR)',
      'weekly_warranty_update_(wwu)':            'Weekly Warranty Update (WWU)',
      'workshop_planner':                        'Workshop Planner',
      'wsd_daily_breakdown_report':              'WSD Daily Breakdown Report',
    };

    let _currentReportUrl = '';

    function openNativeReport(reportKey, reportTitle) {
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
    }

    function closeReportViewer() {
      const viewer = document.getElementById('frappe-report-viewer');
      viewer.style.display = 'none';
      // Clear iframe to stop network activity
      const iframe = document.getElementById('frappe-report-iframe');
      iframe.src = '';
      _currentReportUrl = '';
    }

    function refreshReportViewer() {
      if (!_currentReportUrl) return;
      const loading = document.getElementById('rpt-viewer-loading');
      const loadbar = document.getElementById('rpt-viewer-loadbar');
      const iframe  = document.getElementById('frappe-report-iframe');
      loading.style.display = 'flex';
      loadbar.style.display = 'block';
      iframe.src = _currentReportUrl;
    }"""

if OLD_NATIVE_RPT_FN in content:
    content = content.replace(OLD_NATIVE_RPT_FN, NEW_NATIVE_RPT_FN, 1)
    print('JS replaced OK')
else:
    print('ERROR: JS marker not found')

# ── 3. Add viewer CSS (keyframe + layout) ───────────────────────────────────
OLD_CSS_MARKER = '/* ── REPORT HUB CARDS ── */'

VIEWER_CSS = """/* ── FRAPPE REPORT VIEWER ── */
@keyframes rptLoadSlide {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
/* ── REPORT HUB CARDS ── */"""

if OLD_CSS_MARKER in content:
    content = content.replace(OLD_CSS_MARKER, VIEWER_CSS, 1)
    print('CSS injected OK')
else:
    print('ERROR: CSS marker not found')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('File saved OK')
