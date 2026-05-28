import codecs
import re

reports = [
    ("daily_breakdown_report_(dbr)", "Daily Breakdown Report (DBR)"),
    ("equipment_population_register", "Equipment Population Register"),
    ("field_service_planner", "Field Service Planner"),
    ("fleetrack_activity_list", "Fleetrack Activity List"),
    ("fleetrack_machine_summary", "Fleetrack Machine Summary"),
    ("fleetrack_managed", "Fleetrack Managed"),
    ("fsd_daily_breakdown_report", "FSD Daily Breakdown Report"),
    ("ft_machine_register", "FT Machine Register"),
    ("ft_maintenance_warning_report_mwr", "FT Maintenance Warning Report (MWR)"),
    ("general_defects_report_(gdr)", "General Defects Report (GDR)"),
    ("general_population_register", "General Population Register"),
    ("jobs_to_complete", "Jobs To Complete"),
    ("lost_sales_report_(lsr)", "Lost Sales Report (LSR)"),
    ("machines_due_for_service", "Machines Due for Service"),
    ("major_defects_report_(mdr)", "Major Defects Report (MDR)"),
    ("rdr", "RDR"),
    ("service_tracking_summary_(sts)", "Service Tracking Summary (STS)"),
    ("telematics_alert_report_(tar)", "Telematics Alert Report (TAR)"),
    ("weekly_warranty_update_(wwu)", "Weekly Warranty Update (WWU)"),
    ("workshop_planner", "Workshop Planner"),
    ("wsd_daily_breakdown_report", "WSD Daily Breakdown Report")
]

svg_icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>'

items_html = ""
for r_id, r_name in reports:
    items_html += f'''
            <div class="top-nav-dropdown-item" onclick="if(window.showView) {{ window.selectedReport = '{r_id}'; window.selectedReportName = '{r_name}'; showView('view-reports'); }}">
              <span class="icon" style="margin-right:8px; opacity:0.7;">{svg_icon}</span> {r_name}
            </div>'''

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

# Replace everything inside the dropdown menu div
pattern = r'(<div class="top-nav-dropdown-menu" id="dd-reports-menu">).*?(</div>\s*</div>\s*<div class="top-nav-group")'
replacement = r'\1' + items_html + r'\n          \2'
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(new_content)

print('Updated Reports dropdown menu.')
