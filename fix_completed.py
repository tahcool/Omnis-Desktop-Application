import requests
from supabase import create_client, Client

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU"
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_active_machine_ids(company_alias):
    res = requests.get(
        f"{FRAPPE_URL}/api/method/powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report",
        params={"company": company_alias, "start": 0, "page_length": 5000},
        timeout=30
    )
    data = res.json().get("message", {})
    orders = data.get("current_orders", [])
    
    active_ids = set()
    for o in orders:
        if o.get("machine_id"):
            active_ids.add(o["machine_id"])
    return active_ids

def run():
    print("Fetching active machines from Frappe...")
    mxg_active = fetch_active_machine_ids("machinery")
    spz_active = fetch_active_machine_ids("sinopower")
    
    all_active = mxg_active.union(spz_active)
    print(f"Total active machines from Frappe: {len(all_active)}")
    
    print("Fetching all machines from Supabase...")
    s_res = supabase.table("order_machines").select("id, frappe_row_id, notes").execute()
    s_machines = s_res.data
    
    print(f"Total machines in Supabase: {len(s_machines)}")
    
    updates = 0
    for sm in s_machines:
        fid = sm.get("frappe_row_id")
        if not fid:
            continue
            
        # If it's a dummy row from tracking logic, skip
        if fid.startswith("NONE-"):
            continue
            
        # If it's NOT in the active list, it must be completed
        if fid not in all_active:
            current_notes = sm.get("notes") or ""
            if "[ACTUAL_HANDOVER" not in current_notes and "[COMPLETED]" not in current_notes:
                new_notes = f"[COMPLETED] {current_notes}".strip()
                supabase.table("order_machines").update({"notes": new_notes}).eq("id", sm["id"]).execute()
                updates += 1
                
    print(f"Done! Marked {updates} machines as completed in Supabase.")

if __name__ == "__main__":
    run()
