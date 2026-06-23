import os

file_path = "C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js"
target_path = "C:/Users/Administrator/omnis/temp_extract.txt"
replacement_path = "C:/Users/Administrator/omnis/new_layout.txt"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

with open(target_path, "r", encoding="utf-8") as f:
    target = f.read()

with open(replacement_path, "r", encoding="utf-8") as f:
    replacement = f.read()

if target.strip() in content:
    print("Exact string not found. Stripping and re-searching...")
    
# Attempt replacing exact
new_content = content.replace(target, replacement)
if new_content == content:
    # Let's try matching without leading/trailing whitespace
    target = target.strip()
    idx = content.find(target)
    if idx != -1:
        new_content = content[:idx] + replacement + content[idx + len(target):]
    else:
        print("COULD NOT FIND TARGET")
        exit(1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESSFULLY REPLACED")
