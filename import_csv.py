import csv
import re
import urllib3
from supabase import create_client, Client

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Fetch valid parent IDs from Supabase
print("Fetching valid quotation names from Supabase...")
res1 = supabase.table("quotations").select("name").range(0, 999).execute()
res2 = supabase.table("quotations").select("name").range(1000, 1999).execute()
all_data = res1.data + res2.data

valid_parents_map = {}
for row in all_data:
    name = row["name"]
    # Extract SAL-QTN part
    match = re.search(r'(SAL-QTN-\d{2}-\d+)', name)
    if match:
        frappe_id = match.group(1)
        valid_parents_map[frappe_id] = name
    else:
        valid_parents_map[name] = name

print(f"Found {len(valid_parents_map)} valid quotations.")

csv_path = r'C:\Users\Administrator\Downloads\Quotation (1).csv'

print("Loading CSV...")
items_to_insert = []
parent_id = ""
current_db_parent = None
skipped_parents = set()

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)
    
    # Data starts at row 22 (index 21)
    data_rows = rows[21:]
    
    for row in data_rows:
        if not row:
            continue
            
        # Column 1 is Quotation Name (Parent ID)
        if len(row) > 1 and row[1].strip() != "":
            parent_id = row[1].strip()
            # Resolve to actual DB parent
            match = re.search(r'(SAL-QTN-\d{2}-\d+)', parent_id)
            lookup_key = match.group(1) if match else parent_id
            
            if lookup_key in valid_parents_map:
                current_db_parent = valid_parents_map[lookup_key]
            else:
                current_db_parent = None
                skipped_parents.add(parent_id)
            
        if len(row) > 109 and current_db_parent:
            item_name = row[87].strip()
            qty_str = row[88].strip()
            item_code = row[93].strip()
            rate_str = row[107].strip()
            amount_str = row[109].strip()
            
            # If there's an item on this row
            if item_name or item_code:
                try:
                    qty = float(qty_str) if qty_str else 0.0
                    rate = float(rate_str) if rate_str else 0.0
                    amount = float(amount_str) if amount_str else 0.0
                    
                    items_to_insert.append({
                        "parent": current_db_parent,
                        "item_code": item_code,
                        "item_name": item_name,
                        "qty": qty,
                        "rate": rate,
                        "amount": amount
                    })
                except Exception as e:
                    pass

print(f"Skipped {len(skipped_parents)} invalid parents.")
print(f"Found {len(items_to_insert)} valid items to insert.")

# Delete existing items first to prevent duplicates
print("Deleting existing items to prevent duplicates...")
# Supabase delete requires a filter, so we filter by id > 0 or parent != ''
try:
    supabase.table("quotation_items").delete().neq("parent", "").execute()
except Exception as e:
    pass

# Batch insert
batch_size = 500
for i in range(0, len(items_to_insert), batch_size):
    batch = items_to_insert[i:i+batch_size]
    print(f"Inserting batch {i} to {i+len(batch)}...")
    try:
        supabase.table("quotation_items").insert(batch).execute()
        print("Batch inserted successfully!")
    except Exception as e:
        print(f"Error inserting batch: {e}")
        # Try inserting one by one if batch fails
        for item in batch:
            try:
                supabase.table("quotation_items").insert(item).execute()
            except Exception as e2:
                pass

print("Done migrating items!")
