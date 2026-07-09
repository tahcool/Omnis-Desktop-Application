import csv
import re
import urllib3
from supabase import create_client, Client

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

csv_path = r'C:\Users\Administrator\omnis\Customer.csv'

print("Loading CSV...")
items_to_insert = []
skipped = 0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)
    
    # Data starts after "Start entering data below this line"
    start_index = 0
    for i, row in enumerate(rows):
        if row and len(row) > 0 and "Start entering data below this line" in row[0]:
            start_index = i + 1
            break
            
    if start_index == 0:
        # fallback
        start_index = 20
        
    data_rows = rows[start_index:]
    
    for row in data_rows:
        if not row:
            continue
            
        if len(row) > 19:
            frappe_id = row[1].strip().replace('"', '') # Strip extra quotes
            customer_name = row[2].strip().replace('"', '')
            customer_type = row[3].strip()
            customer_group = row[7].strip() if len(row) > 7 else ""
            tier_str = row[9].strip() if len(row) > 9 else ""
            tier = 1
            if "Tier" in tier_str:
                try:
                    tier = int(tier_str.replace("Tier", "").strip())
                except:
                    pass
            elif tier_str.isdigit():
                tier = int(tier_str)
                
            territory = row[10].strip() if len(row) > 10 else ""
            default_price_list = row[19].strip() if len(row) > 19 else ""
            
            if frappe_id and customer_name:
                items_to_insert.append({
                    "frappe_id": frappe_id,
                    "customer_name": customer_name,
                    "customer_type": customer_type,
                    "customer_group": customer_group,
                    "tier": tier,
                    "territory": territory,
                    "default_price_list": default_price_list
                })
            else:
                skipped += 1

print(f"Found {len(items_to_insert)} customers to insert.")
print(f"Skipped {skipped} rows.")

print("Deleting existing customers to prevent duplicates...")
try:
    # Just deleting all to refresh from the CSV
    supabase.table("customers").delete().neq("frappe_id", "").execute()
except Exception as e:
    print("Delete error:", e)

# Batch insert
batch_size = 500
for i in range(0, len(items_to_insert), batch_size):
    batch = items_to_insert[i:i+batch_size]
    print(f"Inserting batch {i} to {i+len(batch)}...")
    try:
        supabase.table("customers").insert(batch).execute()
        print("Batch inserted successfully!")
    except Exception as e:
        print(f"Error inserting batch: {e}")
        # Try inserting one by one if batch fails
        for item in batch:
            try:
                supabase.table("customers").insert(item).execute()
            except Exception as e2:
                pass

print("Done migrating customers!")
