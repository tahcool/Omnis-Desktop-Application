lines = open('omnis_dashboard.py', encoding='utf-8').read().split('\n')
start = 0
for i, l in enumerate(lines):
    if 'def save_stock_pipeline' in l:
        start = i
        break
if start:
    for i in range(start, start+40):
        print(f'{i+1}: {lines[i]}')
