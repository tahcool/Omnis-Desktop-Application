import re

# 1. Update index.html to add the filter dropdown
with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

target_html = """                    <div style="display:flex;gap:16px;align-items:center;">
                      <div style="display:flex;gap:4px;align-items:center;"><div"""

replacement_html = """                    <div style="display:flex;gap:16px;align-items:center;">
                      <select id="dash-kb-company-filter" onchange="if(window.DashboardTimeline) window.DashboardTimeline.setCompanyFilter(this.value);" style="padding:4px 10px; border-radius:6px; border:1px solid #cbd5e1; font-size:11px; font-weight:700; color:#475569; background:#fff; outline:none; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <option value="ALL">All Companies</option>
                        <option value="SinoPower">SinoPower</option>
                        <option value="Machinery Exchange">Machinery Exchange</option>
                      </select>
                      <div style="width:1px;height:16px;background:#e2e8f0;margin:0 4px;"></div>
                      <div style="display:flex;gap:4px;align-items:center;"><div"""

html_content = html_content.replace(target_html, replacement_html)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

# 2. Update timeline_logic.js
with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Add company_filter state and setCompanyFilter function
if 'let currentCompanyFilter = "ALL";' not in js_content:
    js_content = js_content.replace('let _events = [];', 'let _events = [];\n    let currentCompanyFilter = "ALL";')

js_content = js_content.replace('function renderKanban() {', """function setCompanyFilter(val) {
        currentCompanyFilter = val;
        renderKanban();
    }

    function renderKanban() {""")

# Update renderKanban to filter by company
render_loop_target = """        _events.forEach(e => {
            const eDate = new Date(e.date);"""

render_loop_replacement = """        _events.forEach(e => {
            if (currentCompanyFilter !== "ALL") {
                const rawStr = JSON.stringify(e.raw).toLowerCase();
                const isSino = rawStr.includes("sinopower") || rawStr.includes("spz") || rawStr.includes("sino power");
                const isMxg = rawStr.includes("machinery exchange") || rawStr.includes("mxg") || rawStr.includes("machinery");
                
                if (currentCompanyFilter === "SinoPower" && !isSino) return;
                if (currentCompanyFilter === "Machinery Exchange" && !isMxg) return;
            }

            const eDate = new Date(e.date);"""
js_content = js_content.replace(render_loop_target, render_loop_replacement)

# Update return object to expose setCompanyFilter
export_target = """    return {
        initialize: function() {"""
export_replacement = """    return {
        setCompanyFilter,
        initialize: function() {"""
js_content = js_content.replace(export_target, export_replacement)


# Fix Order titles
order_title_target = "title: `Delivery: ${o.linked_sale_name || o.machine_model || 'Unknown'}`,"
order_title_replacement = "title: `Delivery: ${o.item_name || o.machine || o.machine_model || o.linked_sale_name || 'Machine'}`,"
js_content = js_content.replace(order_title_target, order_title_replacement)

# Fix Stock titles
stock_title_target = "title: `Stock Pipeline: ${s.machine_model || s.machine || s.name}`,"
stock_title_replacement = "title: `Stock Pipeline: ${s.item_name || s.machine_model || s.machine || s.name}`,"
js_content = js_content.replace(stock_title_target, stock_title_replacement)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Updated index.html and timeline_logic.js")
