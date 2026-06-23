import csv
import re
import urllib3
from supabase import create_client, Client

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

csv_path = r'C:\Users\Administrator\omnis\Item (1).csv'

print("Loading CSV...")
items_to_insert = []
skipped = 0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)
    
    start_index = 0
    for i, row in enumerate(rows):
        if row and len(row) > 0 and "Start entering data below this line" in row[0]:
            start_index = i + 1
            break
            
    if start_index == 0:
        start_index = 20
        
    data_rows = rows[start_index:]
    
    for row in data_rows:
        if not row:
            continue
            
        if len(row) > 7:
            frappe_id = row[1].strip().replace('"', '')
            item_code = row[2].strip().replace('"', '')
            item_group_name = row[3].strip()
            uom = row[4].strip()
            item_name = row[7].strip().replace('"', '')
            
            # Additional fields
            rate_str = row[18].strip() if len(row) > 18 else "0"
            brand_name = row[27].strip() if len(row) > 27 else ""
            
            rate = 0.0
            try:
                if rate_str:
                    rate = float(rate_str)
            except:
                pass
            
            if frappe_id and item_code:
                items_to_insert.append({
                    "frappe_id": frappe_id,
                    "item_code": item_code,
                    "item_name": item_name,
                    "item_group_name": item_group_name,
                    "brand_name": brand_name,
                    "uom": uom,
                    "rate": rate
                })
            else:
                skipped += 1

print(f"Found {len(items_to_insert)} items to insert.")
print(f"Skipped {skipped} rows.")

print("Deleting existing products to prevent duplicates...")
try:
    supabase.table("products").delete().neq("frappe_id", "").execute()
except Exception as e:
    print("Delete error:", e)

batch_size = 500
for i in range(0, len(items_to_insert), batch_size):
    batch = items_to_insert[i:i+batch_size]
    print(f"Inserting batch {i} to {i+len(batch)}...")
    try:
        supabase.table("products").insert(batch).execute()
        print("Batch inserted successfully!")
    except Exception as e:
        print(f"Error inserting batch: {e}")
        for item in batch:
            try:
                supabase.table("products").insert(item).execute()
            except Exception as e2:
                pass

print("Done migrating items!")
