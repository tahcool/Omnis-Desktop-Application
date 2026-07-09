import requests
import json
import time
from supabase import create_client, Client

# Supabase Credentials
SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

def call_frappe(method, params=None):
    res = requests.get(f"{FRAPPE_URL}/api/method/{method}", params=params, timeout=20)
    if res.status_code == 200:
        return res.json().get("message", {})
    return {"ok": False, "error": res.text}

def sync_stock_to_supabase(frappe_id, full_data):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Intelligent Brand-Based Company Mapping
    brand = (full_data.get("oem") or "").lower()
    
    company_tag = "Sinopower" # Default
    # Brand Mapping
    mx_brands = ["machinery", "bobcat", "hitachi", "shantui"]
    if any(b in brand for b in mx_brands):
        company_tag = "Machinery Exchange"

    # 2. Parent Stock Record
    parent_payload = {
        "frappe_id": frappe_id,
        "company": company_tag,
        "brand": full_data.get("oem"),
        "model": full_data.get("model"),
        "proposed_qty": full_data.get("proposed_order_quantity") or full_data.get("proposed_order") or 0,
        "actual_qty": full_data.get("quantity") or 0,
        "prod_date": full_data.get("production_completion") or None,
        "ship_date": full_data.get("shipping_date") or None,
        "eta_durban": full_data.get("eta_durban") or None,
        "eta_beira": full_data.get("eta_beira") or full_data.get("ted") or None,
        "eta_harare": full_data.get("eta_harare") or None
    }
    
    supa_parent = supabase.table("stock_inventory").upsert(parent_payload, on_conflict="frappe_id").execute()
    stock_uuid = supa_parent.data[0]["id"]
    
    # 3. Potential Customers
    pot_custs = full_data.get("potential_customers", [])
    if pot_custs:
        # Clear existing for this stock_id to prevent duplicates on re-run
        supabase.table("stock_potential_customers").delete().eq("stock_id", stock_uuid).execute()
        
        cust_payloads = []
        for c in pot_custs:
            if c.get("customer_name"):
                cust_payloads.append({
                    "stock_id": stock_uuid,
                    "customer_name": c.get("customer_name")
                })
        
        if cust_payloads:
            supabase.table("stock_potential_customers").insert(cust_payloads).execute()

def run_stock_migration():
    print("Starting Stock Inventory Migration...")
    
    # 1. Fetch from Stock Pipeline API
    res = call_frappe("powerstar_salestrack.omnis_dashboard.get_stock_pipeline")
    
    if not res.get("ok"):
        print(f"Failed to fetch stock: {res.get('error')}")
        return

    records = res.get("data", [])
    print(f"Found {len(records)} stock records to migrate.")

    count = 0
    for rec in records:
        frappe_id = rec.get("name")
        print(f"Syncing Stock: {rec.get('oem')} {rec.get('model')} ({frappe_id})...", end=" ", flush=True)
        
        try:
            sync_stock_to_supabase(frappe_id, rec)
            count += 1
            print("OK")
        except Exception as e:
            print(f"Error: {e}")
        
        # Small delay to be server-safe
        time.sleep(0.2)

    print(f"\nSTOCK MIGRATION FINISHED!")
    print(f"Total synced: {count}")

if __name__ == "__main__":
    run_stock_migration()
