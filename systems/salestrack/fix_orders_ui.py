import os

html_file = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
js_file = r"c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js"

with open(html_file, "r", encoding="utf-8") as f:
    html = f.read()

# 1. STR Report Button Color
old_str = '''<button id="ol-str-report-btn" class="btn-secondary" onclick="if(window.openSTRReport) window.openSTRReport();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-right:8px; background:#f8fafc; color:#334155; border:1px solid #cbd5e1;">'''
new_str = '''<button id="ol-str-report-btn" class="btn-primary" onclick="if(window.openSTRReport) window.openSTRReport();"
            style="padding:0 20px; border-radius:10px; font-weight:800; height: 42px; font-size: 12px; text-transform:uppercase; letter-spacing:0.02em; margin-right:8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; border:none; box-shadow: 0 4px 12px rgba(37,99,235,0.2);">'''

html = html.replace(old_str, new_str)

# 2. In Progress Default Filter
old_status = '<option value="in progress">In Progress</option>'
new_status = '<option value="in progress" selected>In Progress</option>'
html = html.replace(old_status, new_status)

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated index.html")

with open(js_file, "r", encoding="utf-8") as f:
    js = f.read()

# 3. Remember Company Filter & Initialize Status filter
old_js_init = '''    // Bind Filters - Scoped to the Order Tracking view to avoid conflicts
    const filterContainer = document.getElementById("ol-orders-filters");
    if (filterContainer) {
        filterContainer.querySelectorAll("input, select").forEach(inp => {
            inp.addEventListener("input", () => {
                olOrdersFilter[inp.dataset.filter] = inp.value.trim().toLowerCase();
                olPage = 1; // Reset to page 1 on filter change
                renderOrdersList();
            });
        });
    }'''

new_js_init = '''    // Bind Filters - Scoped to the Order Tracking view to avoid conflicts
    const filterContainer = document.getElementById("ol-orders-filters");
    if (filterContainer) {
        filterContainer.querySelectorAll("input, select").forEach(inp => {
            if (inp.value) olOrdersFilter[inp.dataset.filter] = inp.value.trim().toLowerCase();
            inp.addEventListener("input", () => {
                olOrdersFilter[inp.dataset.filter] = inp.value.trim().toLowerCase();
                olPage = 1; // Reset to page 1 on filter change
                renderOrdersList();
            });
        });
    }'''
js = js.replace(old_js_init, new_js_init)


old_company_bind = '''    // Bind Top Level Filters (Company & Period)
    const companyFilter = document.getElementById("ol-company");
    const fromFilter = document.getElementById("ol-from-date");
    const toFilter = document.getElementById("ol-to-date");

    if (companyFilter) companyFilter.addEventListener("change", () => {
        if (typeof syncCompanyFilters === "function") syncCompanyFilters('ol-company', 'mxg-company-filter');
        if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
        loadOrdersList(true);
    });'''

new_company_bind = '''    // Bind Top Level Filters (Company & Period)
    const companyFilter = document.getElementById("ol-company");
    const fromFilter = document.getElementById("ol-from-date");
    const toFilter = document.getElementById("ol-to-date");

    if (companyFilter) {
        const savedComp = localStorage.getItem('omnis_orders_company');
        if (savedComp) {
            companyFilter.value = savedComp;
        }
        companyFilter.addEventListener("change", () => {
            localStorage.setItem('omnis_orders_company', companyFilter.value);
            if (typeof syncCompanyFilters === "function") syncCompanyFilters('ol-company', 'mxg-company-filter');
            if (typeof syncPeriodFilters === "function") syncPeriodFilters('ol', 'mxg');
            loadOrdersList(true);
        });
    }'''

js = js.replace(old_company_bind, new_company_bind)

# Also fix the Reset button so it correctly resets company? No, reset button only clears `filterContainer` (sub-filters).
# But wait, if Reset clears the status filter, it should probably clear it. That's fine.

with open(js_file, "w", encoding="utf-8") as f:
    f.write(js)
print("Updated orders_logic.js")
