import requests
import json
import time
from supabase import create_client, Client

# Supabase Credentials
SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

def call_frappe(method, params=None):
    res = requests.get(f"{FRAPPE_URL}/api/method/{method}", params=params, timeout=30)
    if res.status_code == 200:
        return res.json().get("message", {})
    return {"ok": False, "error": res.text}

def run_product_migration():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Starting Universal Product Migration...")

    # --- PHASE 1: BRANDS ---
    print("\nPhase 1: Syncing Brands...")
    try:
        # We'll use a generic frappe.get_all approach via a custom method or just get them from items
        # Better: let's fetch them directly if we have a generic fetcher
        # For now, we'll fetch from 'Brand' doctype
        res = call_frappe("frappe.client.get_list", {
            "doctype": "Brand",
            "fields": '["name", "image"]',
            "limit_page_length": 1000
        })
        brands = res if isinstance(res, list) else []
        for b in brands:
            brand_name = b.get("name")
            print(f"Syncing Brand: {brand_name}...", end=" ", flush=True)
            supabase.table("brands").upsert({
                "frappe_id": brand_name,
                "name": brand_name,
                "image_url": b.get("image")
            }, on_conflict="frappe_id").execute()
            print("OK")
    except Exception as e:
        print(f"Brand Sync Warning: {e}")

    # --- PHASE 2: ITEM GROUPS ---
    print("\nPhase 2: Syncing Item Groups...")
    try:
        res = call_frappe("frappe.client.get_list", {
            "doctype": "Item Group",
            "fields": '["name", "parent_item_group"]',
            "limit_page_length": 1000
        })
        groups = res if isinstance(res, list) else []
        for g in groups:
            group_name = g.get("name")
            print(f"Syncing Group: {group_name}...", end=" ", flush=True)
            supabase.table("item_groups").upsert({
                "frappe_id": group_name,
                "name": group_name,
                "parent_group": g.get("parent_item_group")
            }, on_conflict="frappe_id").execute()
            print("OK")
    except Exception as e:
        print(f"Group Sync Warning: {e}")

    # Cache lookup maps for IDs
    brand_map = {b['frappe_id']: b['id'] for b in supabase.table("brands").select("id, frappe_id").execute().data}
    group_map = {g['frappe_id']: g['id'] for g in supabase.table("item_groups").select("id, frappe_id").execute().data}

    # --- PHASE 3: PRODUCTS ---
    print("\nPhase 3: Syncing Products...")
    batch_size = 50
    offset = 0
    total_synced = 0
    
    while True:
        print(f"Fetching Product Batch (Offset: {offset})...")
        res = call_frappe("powerstar_salestrack.omnis_dashboard.get_omnis_products", {
            "start": offset,
            "page_length": batch_size
        })
        
        # Depending on API structure, it might be in 'data' or 'message'
        items = res.get("data") if isinstance(res, dict) else None
        if not items:
            # End of data or error
            break
            
        payloads = []
        for it in items:
            f_id = it.get("name")
            brand_name = it.get("brand")
            group_name = it.get("item_group")
            
            payloads.append({
                "frappe_id": f_id,
                "item_code": it.get("item_code"),
                "item_name": it.get("item_name"),
                "item_group_id": group_map.get(group_name),
                "item_group_name": group_name,
                "brand_id": brand_map.get(brand_name),
                "brand_name": brand_name,
                "uom": it.get("stock_uom"),
                "rate": it.get("standard_rate") or 0,
                "image_url": it.get("image")
            })

        if payloads:
            print(f"Upserting {len(payloads)} items...", end=" ", flush=True)
            supabase.table("products").upsert(payloads, on_conflict="frappe_id").execute()
            total_synced += len(payloads)
            print("OK")
        
        if len(items) < batch_size:
            break
            
        offset += batch_size
        time.sleep(1) # Server safety

    print(f"\nPRODUCT MIGRATION FINISHED!")
    print(f"Final Count: {total_synced} items synced.")

if __name__ == "__main__":
    run_product_migration()
