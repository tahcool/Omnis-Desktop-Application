import os

file_path = r"c:\Users\Administrator\omnis\omnis_dashboard.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# We want to remove lines 3081, 3082, 3083, 3084, 3085 (1-indexed)
# In 0-indexed terms, that's indices 3080, 3081, 3082, 3083, 3084
target_indices = [3080, 3081, 3082, 3083, 3084]

# Double check the content of these lines to be safe
print(f"Index 3080 (Line 3081): {repr(lines[3080])}")
print(f"Index 3084 (Line 3085): {repr(lines[3084])}")

if "IMIT 500" in lines[3080] and "current_orders = frappe.db.sql(query, as_dict=True)" in lines[3084]:
    print("Content matches! Proceeding with deletion.")
    # Remove from end to start to avoid shifting indices
    for i in sorted(target_indices, reverse=True):
        del lines[i]
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("SUCCESS: File repaired.")
else:
    print("ERROR: Line content does not match expected garbage. Aborting repair.")
