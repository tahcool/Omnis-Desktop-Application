import sys

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = 'id="defects-modal-overlay" class="hidden" style="position:fixed; inset:0; z-index:20000;'
replacement = 'id="defects-modal-overlay" class="hidden" style="position:fixed; inset:0; z-index:1000000;'

if target in html:
    html = html.replace(target, replacement)
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Successfully updated z-index in index.html")
else:
    print("Target string not found in index.html")
