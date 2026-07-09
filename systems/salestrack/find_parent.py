with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
import re
for m in re.finditer(r'(?:omnis-logo|omnis-icon)[^"\'<>]*\.(png|svg)', content, re.IGNORECASE):
    idx = m.start()
    ctx = content[max(0,idx-30):idx+100]
    print(repr(ctx))
    print()
