import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

import re
# Regex to remove the script we injected
html = re.sub(r'<script>\s*const oldError = console\.error;.*?</script>\s*</body>', '</body>', html, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Removed error handler")
