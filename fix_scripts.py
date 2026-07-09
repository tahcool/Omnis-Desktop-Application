import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all occurrences of the script tag
target = '<script src="timeline_logic.js"></script>'
count = content.count(target)

if count > 1:
    # Split by target
    parts = content.split(target)
    # The last part comes after the final occurrence.
    # Rejoin all but the last with empty string, then add the target back for the last one
    new_content = ''.join(parts[:-1]) + target + parts[-1]
    
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Removed {count - 1} erroneous script tags.")
else:
    print("Only one script tag found or none.")
