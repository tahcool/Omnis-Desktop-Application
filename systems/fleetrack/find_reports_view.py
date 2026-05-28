import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

for i, line in enumerate(lines):
    if 'id="view-reports"' in line:
        for j in range(i, min(i+5, len(lines))):
            print(f'L{j+1}: {lines[j].rstrip()[:120]}')
        print()
