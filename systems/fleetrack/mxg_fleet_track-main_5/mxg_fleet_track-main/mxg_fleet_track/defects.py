import frappe

def create_defect_logs_from_job_card(doc, method=None):
    # Skip until machine is set
    if not doc.get("esn"):
        return

    for row in (doc.get("job_items") or []):
        if not (row.get("defect_type") and row.get("start_date") and row.get("category")):
            continue

        if frappe.db.exists("FT Defects Log", {
            "machine": doc.esn,
            "category": row.category,
            "start_date": row.start_date
        }):
            continue

        defect = frappe.new_doc("FT Defects Log")
        defect.defect_type = row.defect_type
        defect.start_date = row.start_date
        defect.category = row.category
        defect.description = row.description
        defect.priority = row.priority
        defect.solution = row.solution
        defect.machine = doc.esn
        defect.insert(ignore_permissions=True)
