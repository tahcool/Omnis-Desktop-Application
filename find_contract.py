lines = open('systems/salestrack/index.html', encoding='utf-8').read().split('\n')
for i, line in enumerate(lines):
    if 'sp-contract' in line:
        print(f'{i+1}: {line.strip()}')
