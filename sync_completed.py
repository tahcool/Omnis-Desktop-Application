import requests
from supabase import create_client, Client

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU"
FRAPPE_URL = "https://salestrack.powerstar.co.zw"
HEADERS = {"Authorization": "token 0c14b2d12db200d:48c96c56b62fc92"}

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run():
    print("Fetching ALL Supabase reports...")
    reports = supabase.table("fmb_reports").select("frappe_id").execute().data
    print(f"Got {len(reports)} reports to check.")
    
    completed_map = {}
    
    for r in reports:
        fid = r["frappe_id"]
        if not fid or fid.startswith("TRACK-"):
            continue
            
        res = requests.get(f"{FRAPPE_URL}/api/resource/FMB Report/{fid}", headers=HEADERS)
        if res.status_code == 200:
            data = res.json().get("data", {})
            machines = data.get("machines", [])
            for m in machines:
                actual = m.get("actual_handover_date")
                if actual:
                    # Using the row ID (name) from Frappe
                    completed_map[m["name"]] = actual
    
    print(f"Found {len(completed_map)} completed machines in Frappe!")
    
    # Now update Supabase
    s_res = supabase.table("order_machines").select("id, frappe_row_id, notes").execute()
    s_machines = s_res.data
    
    updates = 0
    for sm in s_machines:
        f_row_id = sm.get("frappe_row_id")
        if f_row_id in completed_map:
            actual = completed_map[f_row_id]
            current_notes = sm.get("notes") or ""
            if "[ACTUAL_HANDOVER" not in current_notes:
                new_notes = f"[ACTUAL_HANDOVER:{actual}] {current_notes}".strip()
                supabase.table("order_machines").update({"notes": new_notes}).eq("id", sm["id"]).execute()
                updates += 1
                
    print(f"Done! Updated {updates} completed machines in Supabase.")

if __name__ == "__main__":
    run()
