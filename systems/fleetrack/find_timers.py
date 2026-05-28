import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()
# Find setInterval / auto-refresh timers
for i, line in enumerate(lines):
    l = line.lower()
    if 'setinterval' in l or ('auto' in l and 'refresh' in l) or ('refresh' in l and 'interval' in l):
        print(f'{i+1}: {line.rstrip()[:130]}')
