import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the Quick Access bar div
start_marker = "<!-- QUICK ACCESS BAR (full width) -->"
end_marker = "<!-- MAIN 3-COL GRID -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

quick_access_block = content[start_idx:end_idx]

buttons_data = [
    ("switchToView('view-quotations-list')", "fa-file-alt", "#2563eb", "Quotations"),
    ("switchToView('view-orders-list')", "fa-truck", "#10b981", "Orders"),
    ("switchToView('view-customers-list')", "fa-users", "#d97706", "Customers"),
    ("switchToView('view-tenders')", "fa-project-diagram", "#8b2219", "Tenders"),
    ("switchToView('view-ce-list')", "fa-clipboard-check", "#9333ea", "CE Reports"),
    ("switchToView('view-marketing')", "fa-bullhorn", "#ec4899", "Marketing"),
    ("window.salestrack.openEfficiencyReportModalV5()", "fa-bolt", "#ef4444", "Efficiency"),
    ("window.salestrack.openMERReportModal()", "fa-chart-line", "#0ea5e9", "Month End"),
    ("switchToView('view-training')", "fa-graduation-cap", "#f59e0b", "Training"),
    ("switchToView('view-training-library'); window.renderTrainingLibrary && window.renderTrainingLibrary();", "fa-book-open", "#7c3aed", "Course Library"),
]

new_buttons_html = ""
for onclick, icon, color, text in buttons_data:
    new_buttons_html += f"""                <button onclick="{onclick}" style="background:#fff; color:#0f172a; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 14px; height:42px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.06); white-space:nowrap; flex:1;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; this.style.transform='none';">
                  <i class="fas {icon}" style="color:{color}; font-size:14px;"></i>
                  <span>{text}</span>
                </button>\n"""

new_block = f"""{start_marker}
          <div style="padding:0 40px;margin-bottom:0;">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;align-items:center;gap:12px;">
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;padding-right:14px;border-right:1px solid #f1f5f9;">
                <div style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;"><i class="fas fa-th" style="color:#fff;font-size:11px;"></i></div>
                <span style="font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;">Quick Access</span>
              </div>
              <div style="display:flex;flex-wrap:nowrap;gap:8px;align-items:center;flex:1;justify-content:space-between;">
{new_buttons_html}              </div>
            </div>
          </div>

          """

content = content[:start_idx] + new_block + content[end_idx:]

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully")
