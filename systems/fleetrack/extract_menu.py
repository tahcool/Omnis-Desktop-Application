import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if 'id="dd-reports-menu"' in line:
        start = i
        break

if start != -1:
    print(''.join(lines[start:start+40]))
