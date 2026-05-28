import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find dashboard view opening tag
for i, line in enumerate(lines):
    if 'id="view-dashboard"' in line:
        print(f'Dashboard open: L{i+1}: {line.rstrip()[:100]}')
    if 'id="view-reports"' in line:
        print(f'Reports open:   L{i+1}: {line.rstrip()[:100]}')
    if 'id="rpt-hub"' in line:
        print(f'rpt-hub:        L{i+1}: {line.rstrip()[:100]}')
    if '<!-- /rpt-hub -->' in line:
        print(f'rpt-hub end:    L{i+1}: {line.rstrip()[:100]}')
    # Find where DBR section starts (after rpt-hub)
    if 'Daily Breakdown Report' in line and 'h2' in line.lower() and 'id=' not in line.lower():
        print(f'DBR heading:    L{i+1}: {line.rstrip()[:100]}')
