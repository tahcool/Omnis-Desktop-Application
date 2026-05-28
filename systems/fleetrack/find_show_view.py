import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find showView function and API constants
for i, line in enumerate(lines):
    l = line.lower()
    if ('showview' in l and 'function' in l) or \
       ('ft_machine_reg' in l) or \
       ('const ft_' in l and 'method' in l.lower()) or \
       ('loadmachine' in l and 'function' in l):
        print(f'{i+1}: {line.rstrip()[:130]}')
