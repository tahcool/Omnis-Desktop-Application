import csv
import re

csv_path = r'C:\Users\Administrator\Downloads\Quotation (1).csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)
    
    # Check the first few valid rows
    for row in rows[21:26]:
        if len(row) > 1 and row[1].strip() != "":
            parent_id = row[1].strip()
            match = re.search(r'(SAL-QTN-\d{2}-\d+)', parent_id)
            lookup_key = match.group(1) if match else parent_id
            print(f"Parent: {parent_id} -> Lookup: {lookup_key}")
