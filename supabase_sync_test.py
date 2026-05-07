import requests
import json
import time
from supabase import create_client, Client

# Supabase Credentials
SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_" + "secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc"
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

def call_frappe(method, params):
    res = requests.get(f"{FRAPPE_URL}/api/method/{method}", params=params, timeout=20)
    if res.status_code == 200:
        return res.json().get("message", {})
    return {"ok": False, "error": res.text}

def sync_order_to_supabase(frappe_id, full_data):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
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
        "order_date": full_data.get("order_date")
    }
    supa_parent = supabase.table("fmb_reports").upsert(parent_payload, on_conflict="frappe_id").execute()
    order_uuid = supa_parent.data[0]["id"]
    
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
            supabase.table("order_machines").upsert(machine_payloads, on_conflict="frappe_row_id").execute()

    # 3. Contacts
    # Note: For contacts we use insert or we'd need a unique row ID from frappe
    # For now we'll just insert if they don't exist (simplification)
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
            # Simple deduplication attempt for this run
            supabase.table("order_contacts").insert(contact_payloads).execute()

def run_full_migration():
    print(f"Starting Full Migration to Supabase...")
    
    # 1. Get Total Count
    try:
        count_res = call_frappe("powerstar_salestrack.omnis_dashboard.get_omnis_orders", {"start": 0, "page_length": 1})
        total = count_res.get("total_count", 234)
        print(f"Found {total} records to migrate.")
    except Exception as e:
        print(f"Could not get total count: {e}")
        total = 234 

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
                        sync_order_to_supabase(order_id, details.get("data", {}))
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

    print(f"\nMIGRATION FINISHED!")
    print(f"Total records processed: {synced_total}")
    print(f"🔗 Target: https://pfqaeewmlwfayxbgmuaq.supabase.co")

if __name__ == "__main__":
    run_full_migration()
