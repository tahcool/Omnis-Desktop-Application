import re

path = r'C:\Users\Administrator\omnis\systems\salestrack\index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Old button onclick — only passes oemName
old = """window.salestrack.openOEMBreakdownModal('${d.oem.replace(/'/g, "\\\\'")}')\""""

# New onclick — also passes dashboard totals as 5th argument
new = """window.salestrack.openOEMBreakdownModal('${d.oem.replace(/'/g, "\\\\'")}', null, null, null, {ytdSales:${sales},ytdQuotes:${quotes}})\""""

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: button updated")
else:
    print("NOT FOUND — printing surrounding context:")
    idx = content.find("openOEMBreakdownModal")
    for i, m in enumerate(re.finditer(r'openOEMBreakdownModal', content)):
        snippet = content[m.start()-20:m.start()+120]
        print(f"--- Match {i} ---")
        print(repr(snippet))
        print()
