import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

pattern = re.compile(
    r'<div style="display:flex;gap:16px;align-items:center;">\s*'
    r'<div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Orders</span></div>\s*'
    r'<div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#d97706;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Quotes</span></div>\s*'
    r'<div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Trainings</span></div>\s*'
    r'<div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#9333ea;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Stock</span></div>\s*'
    r'</div>'
)

replacement_html = """<div style="display:flex;gap:16px;align-items:center;">
                      <select id="dash-kb-company-filter" onchange="if(window.DashboardTimeline) window.DashboardTimeline.setCompanyFilter(this.value);" style="padding:4px 10px; border-radius:6px; border:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#475569; background:#fff; outline:none; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <option value="ALL">All Companies</option>
                        <option value="SinoPower">SinoPower</option>
                        <option value="Machinery Exchange">Machinery Exchange</option>
                      </select>
                      <div style="width:1px;height:16px;background:#e2e8f0;margin:0 4px;"></div>
                      <div style="display:flex;gap:4px;align-items:center;cursor:pointer;" onclick="if(window.DashboardTimeline) window.DashboardTimeline.toggleCategory('order');"><div id="kb-leg-order" style="width:8px;height:8px;border-radius:50%;background:#0284c7;transition:all 0.2s;"></div><span id="kb-leg-txt-order" style="font-size:10px;font-weight:700;color:#64748b;user-select:none;transition:all 0.2s;">Orders</span></div>
                      <div style="display:flex;gap:4px;align-items:center;cursor:pointer;" onclick="if(window.DashboardTimeline) window.DashboardTimeline.toggleCategory('quote');"><div id="kb-leg-quote" style="width:8px;height:8px;border-radius:50%;background:#d97706;transition:all 0.2s;"></div><span id="kb-leg-txt-quote" style="font-size:10px;font-weight:700;color:#64748b;user-select:none;transition:all 0.2s;">Quotes</span></div>
                      <div style="display:flex;gap:4px;align-items:center;cursor:pointer;" onclick="if(window.DashboardTimeline) window.DashboardTimeline.toggleCategory('training');"><div id="kb-leg-training" style="width:8px;height:8px;border-radius:50%;background:#16a34a;transition:all 0.2s;"></div><span id="kb-leg-txt-training" style="font-size:10px;font-weight:700;color:#64748b;user-select:none;transition:all 0.2s;">Trainings</span></div>
                      <div style="display:flex;gap:4px;align-items:center;cursor:pointer;" onclick="if(window.DashboardTimeline) window.DashboardTimeline.toggleCategory('stock');"><div id="kb-leg-stock" style="width:8px;height:8px;border-radius:50%;background:#9333ea;transition:all 0.2s;"></div><span id="kb-leg-txt-stock" style="font-size:10px;font-weight:700;color:#64748b;user-select:none;transition:all 0.2s;">Stock</span></div>
                    </div>"""

new_html_content, count = pattern.subn(replacement_html, html_content)

if count > 0:
    print(f"Successfully replaced {count} occurrence(s).")
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
        f.write(new_html_content)
else:
    print("Regex failed to match!")
