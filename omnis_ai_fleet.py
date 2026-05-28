# mxg_fleet_track/api/omnis_ai_fleet.py

from __future__ import unicode_literals
import frappe
from frappe.utils import today

@frappe.whitelist(allow_guest=True)
def get_ai_fleet_kpi():
    """
    Returns pre-calculated, highly accurate KPI integers for Fleetrack.
    ZERO MATH REQUIRED BY AI.
    """
    # 1. Total Active Breakdowns (Excluding Closed/Completed)
    try:
        active_breakdowns = frappe.db.sql(
            """
            SELECT COUNT(name)
            FROM `tabFSD Daily Breakdown Report`
            WHERE docstatus < 2
              AND status NOT IN ('Closed', 'Completed', 'Resolved')
            """
        )[0][0]
    except Exception:
        active_breakdowns = 0

    # 2. Machines Due For Service
    try:
        due_services = frappe.db.sql(
            """
            SELECT COUNT(name)
            FROM `tabService Tracking Summary (STS)`
            WHERE docstatus < 2
              AND (due_date < %s OR hours_to_service <= 0)
            """,
            (today(),)
        )[0][0]
        
        due_machines_list = frappe.db.sql(
            """
            SELECT equipment_number, customer
            FROM `tabService Tracking Summary (STS)`
            WHERE docstatus < 2
              AND (due_date < %s OR hours_to_service <= 0)
            LIMIT 5
            """,
            (today(),), as_dict=True
        )
    except Exception:
        due_services = 0
        due_machines_list = []

    # 3. Open Major Defects
    try:
        major_defects = frappe.db.sql(
            """
            SELECT COUNT(name)
            FROM `tabMajor Defects Report (MDR)`
            WHERE docstatus < 2
              AND status != 'Closed'
            """
        )[0][0]
    except Exception:
        major_defects = 0

    return {
        "metrics": {
            "active_breakdowns": int(active_breakdowns),
            "machines_due_service": int(due_services),
            "open_major_defects": int(major_defects)
        },
        "due_machines_list": due_machines_list
    }


@frappe.whitelist(allow_guest=True)
def get_ai_customer_fleet(customer_name):
    """
    Returns fleet health for a specific customer.
    Used for the Customer 360 AI Engine.
    """
    if not customer_name:
        return {"error": "Missing customer_name parameter"}
        
    c_filter = f"%{customer_name}%"

    # Total Machines managed for this customer
    try:
        total_machines = frappe.db.sql(
            """
            SELECT COUNT(name)
            FROM `tabFleetrack Machine Summary`
            WHERE docstatus < 2
              AND customer LIKE %s
            """,
            (c_filter,)
        )[0][0]
    except Exception:
        total_machines = 0

    # Active Breakdowns (Machines Down)
    try:
        active_breakdowns = frappe.db.sql(
            """
            SELECT name, equipment_number, site, status, date_reported
            FROM `tabFSD Daily Breakdown Report`
            WHERE docstatus < 2
              AND status NOT IN ('Closed', 'Completed', 'Resolved')
              AND customer LIKE %s
            LIMIT 5
            """,
            (c_filter,), as_dict=True
        )
    except Exception:
        active_breakdowns = []

    # Active Major Defects
    try:
        active_defects = frappe.db.sql(
            """
            SELECT name, equipment_number, description, status
            FROM `tabMajor Defects Report (MDR)`
            WHERE docstatus < 2
              AND status != 'Closed'
              AND customer LIKE %s
            LIMIT 5
            """,
            (c_filter,), as_dict=True
        )
    except Exception:
        active_defects = []

    return {
        "customer": customer_name,
        "fleet_health": {
            "total_machines_managed": int(total_machines),
            "active_breakdowns_count": len(active_breakdowns),
            "active_major_defects_count": len(active_defects),
            "active_breakdowns": active_breakdowns,
            "active_major_defects": active_defects
        }
    }

@frappe.whitelist(allow_guest=True)
def omnis_dynamic_query(doctype, fields, filters=None, limit=5):
    """
    Executes a dynamic query on allowed Frappe Doctypes for the AI on the Fleetrack server.
    """
    import json
    
    allowed_doctypes = ["FT Breakdown Log"]
    if doctype not in allowed_doctypes:
        return {"error": f"Doctype '{doctype}' not permitted for dynamic queries on Fleetrack."}
        
    try:
        parsed_fields = json.loads(fields) if isinstance(fields, str) else fields
        
        parsed_filters = None
        if filters:
            try:
                parsed_filters = json.loads(filters)
            except:
                pass
                
        data = frappe.get_all(
            doctype,
            fields=parsed_fields,
            filters=parsed_filters,
            limit=int(limit),
            order_by="modified DESC"
        )
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

