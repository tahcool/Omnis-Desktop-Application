from __future__ import annotations
import frappe


@frappe.whitelist(allow_guest=True)
def get_ft_defect_summary():
    """
    API for Omnis Fleetrack dashboard – Defects block.

    Returns JSON:
    {
      "counts": { "critical": int, "major": int, "minor": int },
      "rows": [ { ... defect row ... }, ... ],
      "error": "optional error message"
    }
    """

    doctype = "FT Defects Log"

    # Fields taken from your Customize Form
    fields = [
        "name",
        "defect_type",        # Select: Minor / Major
        "machine",            # Link FT Machine
        "customer",           # Link FT Customer
        "fleetrack_managed",  # Select: Yes / No
        "oem",                # Link FT Machine OEM
        "model",              # Link FT Machine Model
        "location",           # Link FT Location
        "warranty_status",    # Select: N/A / Under Warranty / Out of Warranty
        "start_date",
        "priority",           # Select: Low / Medium / High
        "status",
        "description",
        "on_hold",            # Check
        "ted",                # Date
        "end_date",           # Date
        "defect_days",        # Int
    ]

    rows = []
    error = None

    try:
        rows = frappe.db.get_all(
            doctype,
            fields=fields,
            order_by="creation desc",
            limit_page_length=200,
            ignore_permissions=True,
        )
    except Exception as e:
        # Log full traceback in Error Log
        frappe.log_error(
            frappe.get_traceback(),
            "FT Defects Dashboard – get_ft_defect_summary",
        )
        error = str(e)
        # We deliberately DO NOT throw – dashboard should still load

    counts = {"critical": 0, "major": 0, "minor": 0}

    for r in rows:
        pr = (r.get("priority") or "").strip().lower()
        dt = (r.get("defect_type") or "").strip().lower()

        # Forgiving mapping
        if "high" in pr or "critical" in dt:
            counts["critical"] += 1
        elif "major" in dt or "med" in pr:
            counts["major"] += 1
        elif "minor" in dt or "low" in pr:
            counts["minor"] += 1
        else:
            counts["minor"] += 1

    return {
        "counts": counts,
        "rows": rows,
        "error": error,
    }


@frappe.whitelist(allow_guest=True)
def create_ft_defect(machine, defect_type, priority, description):
    """
    Create a new FT Defects Log.
    """
    if not machine or not description:
        return {"error": "Machine and Description are required"}

    try:
        # Validate Machine
        if not frappe.db.exists("FT Machine", machine):
            return {"error": f"Machine '{machine}' not found"}

        machine_doc = frappe.get_doc("FT Machine", machine)
        
        # Create Doc
        doc = frappe.new_doc("FT Defects Log")
        doc.machine = machine
        doc.description = description
        doc.defect_type = defect_type
        doc.priority = priority
        doc.start_date = frappe.utils.nowdate()
        doc.status = "Open"
        
        # Auto-fill from Machine
        doc.customer = machine_doc.customer
        doc.model = machine_doc.model
        doc.location = machine_doc.location
        doc.region = machine_doc.region
        doc.oem = machine_doc.oem
        doc.warranty_status = machine_doc.warranty_status
        
        # Insert
        doc.insert(ignore_permissions=True)
        
        return {"ok": True, "name": doc.name}

    except Exception as e:
        frappe.log_error("Create Defect Failed", str(e))
        return {"error": str(e)}


@frappe.whitelist(allow_guest=True)
def update_ft_defect(name, status=None, priority=None, description=None, end_date=None, defect_type=None):
    """
    Update an existing FT Defects Log.
    """
    if not name:
        return {"error": "Defect Name is required"}

    try:
        doc = frappe.get_doc("FT Defects Log", name)
        
        if status:
            doc.status = status
            # Auto-close date if closing
            if status == "Closed" and not doc.end_date:
                doc.end_date = end_date or frappe.utils.nowdate()
                
        if priority: doc.priority = priority
        if description: doc.description = description
        if end_date: doc.end_date = end_date
        if defect_type: doc.defect_type = defect_type
        
        doc.save(ignore_permissions=True)
        
        return {"ok": True}

    except Exception as e:
        frappe.log_error("Update Defect Failed", str(e))
        return {"error": str(e)}
