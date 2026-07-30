import re

with open('systems/salestrack/dashboard_logic.js', 'r', encoding='utf-8') as f:
    text = f.read()

m1 = re.search(r'window\.OmnisDashboardV6\.prototype\.loadStockMappings = (async function\(\) \{[\s\S]*?\n\});', text)
m2 = re.search(r'window\.OmnisDashboardV6\.prototype\.addStockMapping = (async function\(\) \{[\s\S]*?\n\});', text)
m3 = re.search(r'window\.OmnisDashboardV6\.prototype\.editStockMapping = (function\(.*?\) \{[\s\S]*?\n\});', text)
m4 = re.search(r'window\.OmnisDashboardV6\.prototype\.deleteStockMapping = (async function\(.*?\) \{[\s\S]*?\n\});', text)

with open('admin_salestrack_settings.js', 'r', encoding='utf-8') as f:
    admin_js = f.read()

# Clean up previously appended event listener if it exists
admin_js = admin_js.replace("};\ndocument.addEventListener('DOMContentLoaded', () => { if(window.salestrack.loadStockMappings) window.salestrack.loadStockMappings(); if(window.salestrack.loadEmailRecipients) window.salestrack.loadEmailRecipients(); });\r\n", "")
admin_js = admin_js.replace("};\ndocument.addEventListener('DOMContentLoaded', () => { if(window.salestrack.loadStockMappings) window.salestrack.loadStockMappings(); if(window.salestrack.loadEmailRecipients) window.salestrack.loadEmailRecipients(); });\n", "")
admin_js = admin_js.replace("};\n", "")

admin_js += '    loadStockMappings: ' + m1.group(1).replace('\n', '\n    ') + ',\n'
admin_js += '    addStockMapping: ' + m2.group(1).replace('\n', '\n    ') + ',\n'
admin_js += '    editStockMapping: ' + m3.group(1).replace('\n', '\n    ') + ',\n'
admin_js += '    deleteStockMapping: ' + m4.group(1).replace('\n', '\n    ') + '\n};\n'

admin_js += "document.addEventListener('DOMContentLoaded', () => { if(window.salestrack.loadStockMappings) window.salestrack.loadStockMappings(); if(window.salestrack.loadEmailRecipients) window.salestrack.loadEmailRecipients(); });"

with open('admin_salestrack_settings.js', 'w', encoding='utf-8') as f:
    f.write(admin_js)

print('Appended mappings logic!')
