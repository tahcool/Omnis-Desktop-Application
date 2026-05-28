import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find wwu tile and surrounding context
for i, line in enumerate(lines):
    if 'view-rpt-wwu' in line and 'onclick' in line and 'showView' in line:
        for j in range(i, min(i+10, len(lines))):
            print(f'L{j+1}: {lines[j].rstrip()[:120]}')
        print()

# Find auto-load wwu
for i, line in enumerate(lines):
    if 'loadRptWwu' in line and 'viewId' in line:
        for j in range(max(0,i-1), min(i+3, len(lines))):
            print(f'L{j+1}: {lines[j].rstrip()[:120]}')
        print()
