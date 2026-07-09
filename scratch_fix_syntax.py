import sys

with open(r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\`', '`')
content = content.replace('\\$', '$')

with open(r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed")
