import requests
import json
from supabase import create_client, Client
import sys

SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU"
FRAPPE_URL = "https://salestrack.powerstar.co.zw"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_frappe_owner(frappe_id):
    res = requests.get(f"{FRAPPE_URL}/api/resource/FMB Report/{frappe_id}", headers={"Authorization": "token 0c14b2d12db200d:48c96c56b62fc92"})
    if res.status_code == 200:
        return res.json().get("data", {}).get("owner", "")
    return ""

def run():
    print("Fetching fmb_reports from Supabase...")
    res = supabase.table("fmb_reports").select("id, frappe_id, company").execute()
    records = res.data
    
    updates = 0
    for r in records:
        comp = r.get("company")
        frappe_id = r.get("frappe_id", "")
        if not frappe_id or frappe_id.startswith("TRACK-"):
            continue
            
        # We check owner
        owner = get_frappe_owner(frappe_id).lower()
        if not owner:
            continue
            
        target_company = comp
        if "machinery-exchange.com" in owner or "mxg" in owner:
            target_company = "Machinery Exchange"
        elif "sinopower" in owner or "spz" in owner:
            target_company = "Sinopower"
            
        if target_company != comp:
            print(f"Updating {frappe_id} from {comp} -> {target_company} (owner: {owner})")
            supabase.table("fmb_reports").update({"company": target_company}).eq("id", r["id"]).execute()
            updates += 1
            
    print(f"Done! Updated {updates} records.")

if __name__ == "__main__":
    run()
