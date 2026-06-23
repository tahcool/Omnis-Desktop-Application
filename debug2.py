import csv
import re
import urllib3
from supabase import create_client, Client

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
supabase: Client = create_client("https://pfqaeewmlwfayxbgmuaq.supabase.co", "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc")

print("Fetching valid quotation names from Supabase...")
# Use limit 5000 to get all of them
res = supabase.table("quotations").select("name").limit(5000).execute()
valid_parents_map = {}
for row in res.data:
    name = row["name"]
    match = re.search(r'(SAL-QTN-\d{2}-\d+)', name)
    if match:
        valid_parents_map[match.group(1)] = name

csv_path = r'C:\Users\Administrator\Downloads\Quotation (1).csv'

items_to_insert = []
parent_id = ""
current_db_parent = None

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)[21:]
    
    for row in rows:
        if not row: continue
            
        if len(row) > 1 and row[1].strip() != "":
            parent_id = row[1].strip()
            match = re.search(r'(SAL-QTN-\d{2}-\d+)', parent_id)
            lookup_key = match.group(1) if match else parent_id
            
            if lookup_key in valid_parents_map:
                current_db_parent = valid_parents_map[lookup_key]
                print(f"Found Match: {lookup_key}")
            else:
                current_db_parent = None
            
        if len(row) > 109 and current_db_parent:
            item_name = row[87].strip()
            item_code = row[93].strip()
            if item_name or item_code:
                items_to_insert.append(current_db_parent)
                
print(f"Found {len(items_to_insert)} valid items to insert.")
