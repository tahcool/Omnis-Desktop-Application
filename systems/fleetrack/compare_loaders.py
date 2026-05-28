import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# Find loadRptMwr and loadRptIsr to compare call patterns
import re

for fn in ['loadRptMwr', 'loadRptIsr', 'loadRptWwu']:
    idx = content.find(f'async function {fn}')
    if idx == -1:
        idx = content.find(f'function {fn}')
    if idx != -1:
        snippet = content[idx:idx+500]
        print(f'=== {fn} ===')
        print(snippet[:500])
        print()
