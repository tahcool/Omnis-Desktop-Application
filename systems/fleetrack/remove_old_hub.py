import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find the old hub header (still there after partial replacement)
# and the old rpt-grid-wrap container
start_remove = None
end_remove = None

for i, line in enumerate(lines):
    # The old hub header was re-inserted by mistake — find it
    if '<!-- Hub Header -->' in line and start_remove is None:
        # Check this is the SECOND one (the leftover old one)
        if i > 3590:  # The new one is at the start, old one is later
            start_remove = i
    if '<!-- /rpt-hub -->' in line and start_remove is not None and end_remove is None:
        end_remove = i + 1

print(f'Old hub leftover: lines {start_remove+1 if start_remove else "?"} to {end_remove+1 if end_remove else "?"}')

if start_remove and end_remove:
    # Show what we're removing
    print('Removing:')
    for j in range(start_remove, min(start_remove+3, end_remove)):
        print(f'  L{j+1}: {lines[j].rstrip()[:100]}')
    print(f'  ...({end_remove - start_remove} lines total)')
    for j in range(max(end_remove-3, start_remove), end_remove):
        print(f'  L{j+1}: {lines[j].rstrip()[:100]}')
    
    # Remove the old hub block
    new_lines = lines[:start_remove] + lines[end_remove:]
    f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
    f.writelines(new_lines)
    f.close()
    print(f'\nRemoved {end_remove - start_remove} lines. File saved OK.')
else:
    print('Old hub block not found — checking for rpt-grid-wrap...')
    for i, line in enumerate(lines):
        if 'rpt-grid-wrap' in line or 'rpt-category' in line:
            print(f'L{i+1}: {line.rstrip()[:100]}')
