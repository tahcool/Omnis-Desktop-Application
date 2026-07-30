lines = open('systems/salestrack/index.html', encoding='utf-8').read().split('\n')
for i, l in enumerate(lines):
    if 'sp-contract' in l and 'readOnly' in l:
        print(f'{i+1}: {l.strip()}')
    if 'sp-contract' in l and 'disabled' in l:
        print(f'{i+1}: {l.strip()}')
