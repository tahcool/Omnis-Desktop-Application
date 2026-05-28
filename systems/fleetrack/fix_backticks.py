import sys, re
with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(r'title: \DBR  - \,', 'title: `DBR - `,')
c = re.sub(r'(tbody\.innerHTML = list\.map\(a => \s*)<tr', r'\1`<tr', c)
c = c.replace('</tr>\n        ).join("");', '</tr>`\n        ).join("");')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed backticks properly!")
