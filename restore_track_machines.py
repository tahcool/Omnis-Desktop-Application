import requests
from supabase import create_client, Client

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run():
    print("Fetching TRACK- orders from Supabase...")
    res = supabase.table("fmb_reports").select("id, frappe_id, order_machines(id, notes)").like("frappe_id", "TRACK-%").execute()
    track_orders = res.data
    
    updates = 0
    for t in track_orders:
        machines = t.get("order_machines", [])
        for m in machines:
            notes = m.get("notes") or ""
            if "[COMPLETED]" in notes:
                # Remove [COMPLETED] from TRACK- orders since they are manual
                new_notes = notes.replace("[COMPLETED]", "").strip()
                supabase.table("order_machines").update({"notes": new_notes}).eq("id", m["id"]).execute()
                updates += 1
                
    print(f"Done! Restored {updates} manual tracking machines by removing [COMPLETED].")

if __name__ == "__main__":
    run()
