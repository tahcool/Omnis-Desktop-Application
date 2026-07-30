lines = open('omnis-web-deploy/systems/salestrack/index.html', encoding='utf-8').read().split('\n')
for i, line in enumerate(lines):
    if 'sp-oem' in line:
        print(f'{i+1}: {line.strip()}')
