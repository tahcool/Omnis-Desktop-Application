import requests
import json
import time
import urllib3
from supabase import create_client, Client
from datetime import datetime

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
SALESTRACK_IP = "102.207.50.172"
SALESTRACK_DOMAIN = "salestrack.powerstar.co.zw"

FRAPPE_TOKEN = "token 73624aafe4cc8cc:21d3b98f10df277"
SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co"
SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def frappe_request(method, params=None):
    headers = {
        "Authorization": FRAPPE_TOKEN,
        "Host": SALESTRACK_DOMAIN,
        "Origin": f"https://{SALESTRACK_DOMAIN}",
        "Referer": f"https://{SALESTRACK_DOMAIN}/app",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    url = f"https://{SALESTRACK_IP}/api/method/{method}"
    
    retries = 5
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, params=params, verify=False, timeout=60)
            if response.status_code == 200:
                return response.json().get("message")
            else:
                print(f"Error {response.status_code} on attempt {attempt+1}: {response.text[:200]}")
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            
        time.sleep(5 * (attempt + 1))
        
    return None

def migrate_quotations():
    print("Starting Optimized Standard Migration (Batched Items)...")
    
    try:
        res = supabase.table("quotations").select("creation").order("creation", desc=False).limit(1).execute()
        if res.data:
            cursor = res.data[0]['creation']
            if '+' in cursor: cursor = cursor.split('+')[0]
            print(f"Oldest record in Supabase: {cursor}. Fetching older records...")
        else:
            cursor = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"No records in Supabase. Starting from {cursor}...")
    except Exception as e:
        print(f"Error getting cursor: {e}")
        cursor = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    limit = 50 # Smaller batch size for headers too
    total_migrated = 0
    
    while True:
        print(f"Fetching batch before {cursor}...")
        
        headers = frappe_request("frappe.client.get_list", {
            "doctype": "Quotation",
            "fields": json.dumps(["name", "customer_name", "transaction_date", "grand_total", "status", "company", "custom_sales_person", "territory", "customer_group", "creation"]),
            "filters": json.dumps([["docstatus", "<", 2], ["creation", "<", cursor]]),
            "order_by": "creation desc",
            "limit_page_length": limit
        })
        
        if not headers:
            if headers == []:
                print("No more records found.")
                break
            print("Failed to fetch headers. Stopping.")
            break
            
        names = [h['name'] for h in headers]
        
        # Fetch items
        items = frappe_request("frappe.client.get_list", {
            "doctype": "Quotation Item",
            "fields": json.dumps(["parent", "item_code", "item_name", "qty", "rate", "amount"]),
            "filters": json.dumps([["parent", "in", names]]),
            "limit_page_length": 1000
        }) or []
        
        # Fetch Item Brand/Group in SMALL BATCHES to avoid URL length limit
        item_codes = list(set([i['item_code'] for i in items if i.get('item_code')]))
        item_map = {}
        if item_codes:
            batch_size = 40 # Small enough to keep URL under 4KB
            for i in range(0, len(item_codes), batch_size):
                batch = item_codes[i:i + batch_size]
                print(f"  Fetching metadata for {len(batch)} items...")
                item_meta = frappe_request("frappe.client.get_list", {
                    "doctype": "Item",
                    "fields": json.dumps(["name", "brand", "item_group"]),
                    "filters": json.dumps([["name", "in", batch]]),
                    "limit_page_length": len(batch)
                }) or []
                for m in item_meta:
                    item_map[m['name']] = m
        
        # Prepare data
        sb_headers = []
        for h in headers:
            sb_headers.append({
                "name": h['name'],
                "customer_name": h.get('customer_name'),
                "transaction_date": h.get('transaction_date'),
                "grand_total": float(h.get('grand_total') or 0),
                "status": h.get('status'),
                "company": h.get('company'),
                "custom_sales_person": h.get('custom_sales_person'),
                "territory": h.get('territory'),
                "customer_group": h.get('customer_group'),
                "creation": h.get('creation')
            })
            
        sb_items = []
        for i in items:
            meta = item_map.get(i['item_code'], {})
            sb_items.append({
                "parent": i['parent'],
                "item_code": i['item_code'],
                "item_name": i['item_name'],
                "qty": float(i.get('qty') or 0),
                "rate": float(i.get('rate') or 0),
                "amount": float(i.get('amount') or 0),
                "brand": meta.get('brand'),
                "item_group": meta.get('item_group')
            })
            
        # Push to Supabase
        if sb_headers:
            supabase.table("quotations").upsert(sb_headers).execute()
        if sb_items:
            supabase.table("quotation_items").insert(sb_items).execute()
                
        total_migrated += len(headers)
        cursor = headers[-1]['creation']
        if '+' in cursor: cursor = cursor.split('+')[0]
        
        print(f"Batch complete. Migrated {len(headers)} more. Total: {total_migrated}. Cursor: {cursor}")
        time.sleep(5) # Conservative delay
        
    print(f"Migration finished. Total: {total_migrated}")

if __name__ == "__main__":
    migrate_quotations()
