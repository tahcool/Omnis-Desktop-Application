import re

with open('systems/fleetrack/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

doctypes = set(re.findall(r"doctype\s*:\s*['\"]([^'\"]+)['\"]", text))
print("Doctypes found:")
for d in doctypes:
    print("-", d)
