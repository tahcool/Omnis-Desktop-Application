import sys

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('      }\n    }\n    }\n', '      }\n    }\n')
c = c.replace('      }\n    }\n\n', '      }\n\n')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed double braces')
