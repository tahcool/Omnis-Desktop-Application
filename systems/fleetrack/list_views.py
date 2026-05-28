import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()
for i, line in enumerate(lines):
    if 'id="view-' in line and 'view-page' in line:
        print(f'{i+1}: {line.strip()[:100]}')
