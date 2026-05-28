import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# See how loadFtDefects uses the response - what fields does the defect API return?
in_load_defects = False
for i, line in enumerate(lines):
    if 'async function loadFtDefects' in line:
        in_load_defects = True
    if in_load_defects:
        print(f'L{i+1}: {line.rstrip()[:130]}')
        if i > 0 and line.strip() == '}' and in_load_defects:
            count = sum(1 for l in lines[11890:i+1] if l.strip() == '}')
            # Just show 60 lines max
    if in_load_defects and i > 11950:
        break
