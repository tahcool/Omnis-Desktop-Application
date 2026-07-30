import re
with open('systems/salestrack/dashboard_logic.js', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'window\.omnisFetchStockCompanyMappings = (async function\(\) \{[\s\S]*?\n\});', text)

with open('admin_salestrack_settings.js', 'r', encoding='utf-8') as f:
    admin_js = f.read()

admin_js = admin_js.replace("window.salestrack = {", "window.omnisFetchStockCompanyMappings = " + m.group(1) + ";\n\nwindow.salestrack = {")

with open('admin_salestrack_settings.js', 'w', encoding='utf-8') as f:
    f.write(admin_js)

print('Added fetch function')
