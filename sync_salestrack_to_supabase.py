"""
sync_salestrack_to_supabase.py
Phase 1 sync script: Pulls Salestrack data from Frappe and upserts to Supabase.
Tables synced:
  - fmb_reports (Order Headers)
  - gsm_tasks (Task Manager)
  - stock_pipeline
Note: frappe_group_sales already has 299 rows and is already synced.
"""

import sys
import io
# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
FRAPPE_URL = "https://salestrack.powerstar.co.zw"
FRAPPE_METHOD_BASE = "powerstar_salestrack.omnis_dashboard"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def frappe_get(method, params=None):
    url = f"{FRAPPE_URL}/api/method/{FRAPPE_METHOD_BASE}.{method}"
    r = requests.get(url, params=params or {}, timeout=30)
    if r.status_code == 200:
        return r.json().get("message", {})
    print(f"  ❌ Frappe error {r.status_code}: {r.text[:200]}")
    return {}


def safe_date(val):
    """Convert date string to ISO format or None."""
    if not val:
        return None
    try:
        # Handle various formats
        for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"]:
            try:
                return datetime.strptime(str(val)[:19], fmt).date().isoformat()
            except:
                continue
    except:
        pass
    return None


# ── 1. Sync FMB Reports (Order Headers) ─────────────────────────────────────

def sync_fmb_reports():
    print("\n📦 Syncing FMB Reports (Order Headers)...")
    page_size = 50
    offset = 0
    total_synced = 0

    while True:
        result = frappe_get("get_omnis_orders", {"start": offset, "page_length": page_size})
        rows = result.get("data", [])
        if not rows:
            break

        payloads = []
        for r in rows:
            payloads.append({
                "frappe_id":     r.get("name"),
                "customer_id":   r.get("customer_name"),
                "customer_name": r.get("customer_name"),
                "order_date":    safe_date(r.get("order_date")),
                "status":        r.get("status"),
                "company":       r.get("company", ""),
                "machine":       r.get("machine_label") or r.get("machine"),
                "modified":      r.get("modified"),
                "synced_at":     datetime.utcnow().isoformat(),
            })

        if payloads:
            res = supabase.table("fmb_reports").upsert(payloads, on_conflict="frappe_id").execute()
            total_synced += len(payloads)
            print(f"  ✅ Batch offset {offset}: {len(payloads)} records upserted")

        total_count = result.get("total_count", 0)
        offset += page_size
        if offset >= total_count or len(rows) < page_size:
            break
        time.sleep(0.5)

    print(f"  🎉 FMB Reports done: {total_synced} total upserted")
    return total_synced


# ── 2. Sync GSM Tasks ────────────────────────────────────────────────────────

def sync_gsm_tasks():
    print("\n📋 Syncing GSM Tasks...")
    result = frappe_get("get_gsm_tasks")
    tasks = result.get("tasks", [])

    if not tasks:
        print("  ⚠️  No tasks returned from Frappe")
        return 0

    payloads = []
    for t in tasks:
        payloads.append({
            "frappe_id":     t.get("name"),
            "assignee":      t.get("assignee"),
            "task":          t.get("task"),
            "date_assigned": safe_date(t.get("date_assigned")),
            "ted":           safe_date(t.get("ted")),
            "comment":       t.get("comment"),
            "status":        t.get("status"),
            "category":      t.get("category"),
            "is_urgent":     bool(t.get("is_urgent")),
            "owner":         t.get("owner"),
            "synced_at":     datetime.utcnow().isoformat(),
        })

    if payloads:
        supabase.table("gsm_tasks").upsert(payloads, on_conflict="frappe_id").execute()
        print(f"  ✅ {len(payloads)} tasks upserted")

    return len(payloads)


# ── 3. Sync Stock Pipeline ───────────────────────────────────────────────────

def sync_stock_pipeline():
    print("\n🏗️  Syncing Stock Pipeline...")
    result = frappe_get("get_stock_pipeline")
    records = result.get("data", [])

    if not records:
        print("  ⚠️  No stock pipeline records returned from Frappe")
        return 0

    payloads = []
    for r in records:
        # Grab known fields — the doctype has lots of custom fields
        payloads.append({
            "frappe_id":           r.get("name"),
            "machine":             r.get("machine") or r.get("item"),
            "brand":               r.get("brand") or r.get("oem"),
            "model":               r.get("model"),
            "serial_no":           r.get("serial_no") or r.get("serial_number"),
            "status":              r.get("status"),
            "eta":                 safe_date(r.get("eta") or r.get("expected_delivery")),
            "port_of_origin":      r.get("port_of_origin") or r.get("loading_port"),
            "destination":         r.get("destination"),
            "notes":               r.get("notes") or r.get("remarks"),
            "owner":               r.get("owner"),
            "potential_customers": json.dumps(r.get("potential_customers", [])),
            "synced_at":           datetime.utcnow().isoformat(),
        })

    if payloads:
        supabase.table("stock_pipeline").upsert(payloads, on_conflict="frappe_id").execute()
        print(f"  ✅ {len(payloads)} stock pipeline records upserted")

    return len(payloads)


# ── 4. Verify Group Sales (already synced) ───────────────────────────────────

def verify_group_sales():
    print("\n📊 Verifying Group Sales (frappe_group_sales)...")
    r = supabase.table("frappe_group_sales").select("name", count="exact", head=True).execute()
    count = r.count
    print(f"  ✅ {count} group sales records already in Supabase")
    return count


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Salestrack → Supabase Phase 1 Sync")
    print("=" * 60)

    results = {}
    results["fmb_reports"]    = sync_fmb_reports()
    results["gsm_tasks"]      = sync_gsm_tasks()
    results["stock_pipeline"] = sync_stock_pipeline()
    results["group_sales"]    = verify_group_sales()

    print("\n" + "=" * 60)
    print("✅ SYNC COMPLETE")
    for k, v in results.items():
        print(f"   {k}: {v} records")
    print("=" * 60)
