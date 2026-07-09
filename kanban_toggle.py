import re

# 1. Update index.html
with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

target_html = """                    <div style="display:flex;gap:16px;align-items:center;">
                      <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Orders</span></div>
                      <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#d97706;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Quotes</span></div>
                      <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Trainings</span></div>
                      <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#9333ea;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Stock</span></div>
                    </div>"""

replacement_html = """                    <div style="display:flex;gap:16px;align-items:center;">
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

if target_html in html_content:
    html_content = html_content.replace(target_html, replacement_html)
    print("Found and replaced target HTML in index.html")
else:
    print("Could not find target HTML in index.html")

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)


# 2. Update timeline_logic.js to handle category toggling
with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Add hidden categories state and logic
if 'let hiddenCategories = new Set();' not in js_content:
    js_content = js_content.replace('let currentCompanyFilter = "ALL";', 'let currentCompanyFilter = "ALL";\n    let hiddenCategories = new Set();')

toggle_func = """    function toggleCategory(cat) {
        if (hiddenCategories.has(cat)) {
            hiddenCategories.delete(cat);
            document.getElementById('kb-leg-' + cat).style.background = COLORS[cat].text;
            document.getElementById('kb-leg-txt-' + cat).style.opacity = '1';
        } else {
            hiddenCategories.add(cat);
            document.getElementById('kb-leg-' + cat).style.background = '#e2e8f0';
            document.getElementById('kb-leg-txt-' + cat).style.opacity = '0.5';
        }
        renderKanban();
    }

    function renderKanban() {"""

if 'function toggleCategory' not in js_content:
    js_content = js_content.replace('function renderKanban() {', toggle_func)

# Update renderKanban to filter out hidden categories
filter_target = """        _events.forEach(e => {
            if (currentCompanyFilter !== "ALL") {"""
filter_replacement = """        _events.forEach(e => {
            if (hiddenCategories.has(e.type)) return;
            
            if (currentCompanyFilter !== "ALL") {"""

if 'if (hiddenCategories.has(e.type)) return;' not in js_content:
    js_content = js_content.replace(filter_target, filter_replacement)

# Export toggleCategory
export_target = """    return {
        setCompanyFilter,"""
export_replacement = """    return {
        setCompanyFilter,
        toggleCategory,"""
if 'toggleCategory,' not in js_content:
    js_content = js_content.replace(export_target, export_replacement)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("Updated timeline_logic.js with toggleCategory")
