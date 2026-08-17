import requests
import json
import time
from supabase import create_client, Client

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU"
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

def call_frappe(method, params):
    res = requests.get(f"{FRAPPE_URL}/api/method/{method}", params=params, timeout=30)
    if res.status_code == 200:
        return res.json().get("message", {})
    return {"ok": False, "error": res.text}

def sync_order_to_supabase(supabase: Client, frappe_id, full_data):
    # Intelligent Company Mapping
    raw_owner = (full_data.get("owner") or "").lower()
    raw_company = (full_data.get("company") or "").lower()
    
    company_tag = "Sinopower" # Default
    if "machinery" in raw_owner or "machinery" in raw_company:
        company_tag = "Machinery Exchange"
    elif "sinopower" in raw_owner or "sinopower" in raw_company:
        company_tag = "Sinopower"
        
    # 1. Parent
    parent_payload = {
        "frappe_id": frappe_id,
        "status": full_data.get("status"),
        "customer_id": full_data.get("customer_name"),
        "company": company_tag,
        "order_date": full_data.get("order_date"),
        "is_payment_terms": full_data.get("is_payment_terms") == 1
    }
    
    # Upsert parent and get UUID
    supa_parent = supabase.table("fmb_reports").upsert(parent_payload, on_conflict="frappe_id").execute()
    order_uuid = supa_parent.data[0]["id"]
    
    # Delete existing machines and contacts to avoid duplicates
    supabase.table("order_machines").delete().eq("order_id", order_uuid).execute()
    supabase.table("order_contacts").delete().eq("order_id", order_uuid).execute()
    
    # 2. Machines
    machines = full_data.get("machines", [])
    if machines:
        machine_payloads = []
        for m in machines:
            machine_payloads.append({
                "order_id": order_uuid,
                "frappe_row_id": m.get("name"),
                "item_code": m.get("item"),
                "serial_no": m.get("serial_no"),
                "quantity": m.get("qty") or 1,
                "target_date": m.get("target_handover_date") or None,
                "revised_date": m.get("revised_handover_date") or None,
                "notes": m.get("notes"),
                "image_1_url": m.get("images_one"),
                "image_2_url": m.get("image_two")
            })
        if machine_payloads:
            supabase.table("order_machines").insert(machine_payloads).execute()

    # 3. Contacts
    contacts = full_data.get("contacts", [])
    if contacts:
        contact_payloads = []
        for c in contacts:
            contact_payloads.append({
                "order_id": order_uuid,
                "salutation": c.get("salutation"),
                "name": c.get("name1") or c.get("name"),
                "phone": c.get("phone_number"),
                "email": c.get("email_address")
            })
        if contact_payloads:
            supabase.table("order_contacts").insert(contact_payloads).execute()

def migrate_track_orders(supabase: Client):
    print("\n--- Migrating TRACK- Orders ---")
    track_orders = supabase.table("omnis_tracking_orders").select("*").execute()
    count = 0
    for t in track_orders.data:
        frappe_id = "TRACK-" + t["id"]
        # parent
        parent_payload = {
            "frappe_id": frappe_id,
            "status": t.get("status"),
            "customer_id": t.get("customer"),
            "company": t.get("company"),
            "order_date": t.get("order_date"),
            "is_payment_terms": False
        }
        supa_parent = supabase.table("fmb_reports").upsert(parent_payload, on_conflict="frappe_id").execute()
        order_uuid = supa_parent.data[0]["id"]
        
        # Delete existing machines
        supabase.table("order_machines").delete().eq("order_id", order_uuid).execute()
        
        # Machine
        machine_payload = {
            "order_id": order_uuid,
            "frappe_row_id": "TRACK-M-" + t["id"],
            "item_code": t.get("machine"),
            "quantity": t.get("qty") or 1,
            "target_date": t.get("target_handover") or None,
            "revised_date": t.get("revised_handover") or None,
            "notes": t.get("notes")
        }
        supabase.table("order_machines").insert(machine_payload).execute()
        count += 1
    print(f"Migrated {count} TRACK- orders.")


def run_full_migration():
    print(f"Starting Full Migration to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Get Total Count
    try:
        count_res = call_frappe("powerstar_salestrack.omnis_dashboard.get_omnis_orders", {"start": 0, "page_length": 1})
        total = count_res.get("total_count", 0)
        print(f"Found {total} records in Frappe to migrate.")
    except Exception as e:
        print(f"Could not get total count: {e}")
        return

    offset = 0
    batch_size = 50
    synced_total = 0

    while offset < total:
        print(f"\nProcessing Batch {offset//batch_size + 1} (Offset: {offset})...")
        
        try:
            batch_res = call_frappe("powerstar_salestrack.omnis_dashboard.get_omnis_orders", {
                "start": offset,
                "page_length": batch_size
            })
            orders = batch_res.get("data", [])
            
            if not orders:
                print("No more orders found.")
                break

            for order in orders:
                order_id = order.get("name")
                print(f"Syncing: {order_id}...", end=" ", flush=True)
                
                try:
                    details = call_frappe("powerstar_salestrack.omnis_dashboard.get_order_details", {"report_id": order_id})
                    if details.get("ok"):
                        sync_order_to_supabase(supabase, order_id, details.get("data", {}))
                        synced_total += 1
                        print("OK")
                    else:
                        print(f"Detail Err: {details.get('error')}")
                except Exception as ex:
                    print(f"Error: {ex}")

            offset += batch_size
            print(f"Cooling down server (1.5s)...")
            time.sleep(1.5)

        except Exception as e:
            print(f"Batch Fatal: {e}")
            break
            
    # 2. Migrate TRACK- orders
    migrate_track_orders(supabase)

    print(f"\nMIGRATION FINISHED!")
    print(f"Total Frappe records processed: {synced_total}")

if __name__ == "__main__":
    run_full_migration()
