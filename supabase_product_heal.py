import json
from supabase import create_client, Client

# Supabase Credentials
SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc"

def heal_product_relations():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Starting Product Relation Healing...")

    # 1. Fetch all products to extract brands and groups
    products = supabase.table("products").select("brand_name, item_group_name").execute().data
    
    unique_brands = sorted(list(set([p['brand_name'] for p in products if p['brand_name']])))
    unique_groups = sorted(list(set([p['item_group_name'] for p in products if p['item_group_name']])))

    print(f"Detected {len(unique_brands)} unique brands and {len(unique_groups)} unique groups.")

    # 2. Populate Brands
    for b_name in unique_brands:
        print(f"Populating Brand: {b_name}...", end=" ", flush=True)
        supabase.table("brands").upsert({
            "frappe_id": b_name,
            "name": b_name
        }, on_conflict="frappe_id").execute()
        print("OK")

    # 3. Populate Item Groups
    for g_name in unique_groups:
        print(f"Populating Group: {g_name}...", end=" ", flush=True)
        supabase.table("item_groups").upsert({
            "frappe_id": g_name,
            "name": g_name
        }, on_conflict="frappe_id").execute()
        print("OK")

    # 4. Re-link Products to IDs
    print("\nRe-linking products to new IDs...")
    brand_map = {b['frappe_id']: b['id'] for b in supabase.table("brands").select("id, frappe_id").execute().data}
    group_map = {g['frappe_id']: g['id'] for g in supabase.table("item_groups").select("id, frappe_id").execute().data}

    # Batch update products
    # We'll do it one by one for safety or in small chunks
    products_to_fix = supabase.table("products").select("id, brand_name, item_group_name").execute().data
    
    count = 0
    for p in products_to_fix:
        b_id = brand_map.get(p['brand_name'])
        g_id = group_map.get(p['item_group_name'])
        
        if b_id or g_id:
            supabase.table("products").update({
                "brand_id": b_id,
                "item_group_id": g_id
            }).eq("id", p['id']).execute()
            count += 1
            if count % 50 == 0:
                print(f"Linked {count} products...")

    print(f"\nRELATION HEALING FINISHED!")
    print(f"Updated {count} product links.")

if __name__ == "__main__":
    heal_product_relations()
