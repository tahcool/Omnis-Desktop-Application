import sys

with open('index.html.fromgit', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('class="sidebar')
if idx != -1:
    print(c[max(0, idx-200):idx+500])
else:
    print('Not found')
