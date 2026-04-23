import frappe
import json

def get_logs():
    try:
        frappe.init(".")
        frappe.connect()
        # Query for both my OMNIS_DEBUG logs and the standard OEM Details Error logs
        logs = frappe.db.sql("""
            SELECT title, message, creation 
            FROM `tabError Log` 
            WHERE title IN ('OMNIS_DEBUG', 'OEM Details Error')
            ORDER BY creation DESC LIMIT 50
        """, as_dict=True)
        
        if not logs:
            print("No logs found.")
            return

        for l in logs:
            print(f"\n[{l.creation}] {l.title}:")
            print(l.message)
            print("-" * 40)
            
    except Exception as e:
        print(f"Error fetching logs: {str(e)}")

if __name__ == "__main__":
    get_logs()
