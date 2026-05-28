import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find the reports hub view container
for i, line in enumerate(lines):
    if 'view-reports' in line and ('id=' in line or 'class=' in line):
        print(f'L{i+1}: {line.rstrip()[:120]}')
    if 'Fleetrack Reports' in line or 'report-hub' in line or 'rpt-hub' in line:
        print(f'L{i+1}: {line.rstrip()[:120]}')
