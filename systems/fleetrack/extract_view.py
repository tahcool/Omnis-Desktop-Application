import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if 'id="view-reports"' in line:
        start = i
        break

if start != -1:
    res = ''.join(lines[start:start+40])
    print(res.encode('ascii', errors='replace').decode('ascii'))
