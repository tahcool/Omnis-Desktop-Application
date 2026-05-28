import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find FT_DEFECT_SUMMARY_METHOD context
for i, line in enumerate(lines):
    l = line.lower()
    if 'ft_defect_summary_method' in l or 'ft_defect_create_method' in l:
        # Show 2 lines before for context
        start = max(0, i-2)
        for j in range(start, i+2):
            print(f'L{j+1}: {lines[j].rstrip()[:120]}')
        print()
        break

# Find machine register response parsing to see field names
print('\n--- Machine register field names from existing view ---')
for i, line in enumerate(lines):
    l = line
    if ('machine.last_service' in l.lower() or
        'machine.warranty_type' in l.lower() or
        'machine.warranty_status' in l.lower() or
        '.service_interval' in l.lower() or
        'm.last_service' in l.lower() or
        'hmr_service' in l.lower()):
        print(f'L{i+1}: {l.rstrip()[:130]}')
