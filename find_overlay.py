lines = open('systems/salestrack/index.html', encoding='utf-8').read().split('\n')
for i, l in enumerate(lines):
    if 'omnis-confirm-overlay' in l:
        print(f'{i+1}: {l.strip()[:1000]}')
