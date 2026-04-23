import frappe
from frappe.utils import today, getdate, add_days, formatdate

@frappe.whitelist(allow_guest=True)
def get_ft_job_cards(region=None, customer=None, status=None):
    """
    Fetch Job Cards for the dashboard, grouped by date for the calendar strip.
    """
    try:
        # 1. Fetch Job Cards
        filters = {}
        if region:
            # Note: region might be on the machine, not direct on Job Card
            pass
        if customer:
            filters["customer_name"] = customer
        if status:
            filters["status"] = status

        jobs = frappe.get_all(
            "FT Job Card",
            filters=filters,
            fields=[
                "name", "customer_name", "site__location", 
                "machine_make", "model", "technician", 
                "vin_number", "job_description", "creation",
                "docstatus"
            ],
            order_by="creation desc",
            limit_page_length=200,
            ignore_permissions=True
        )

        # 2. Process for Calendar (Last 7 days + Today + Future 7 days?)
        # User asked for "reminders for jobs due today and for the week"
        # Since I don't see a clear 'due_date', I'll use 'creation' or assume current week context.
        # Let's target the current week.
        
        start_of_week = add_days(today(), -getdate(today()).weekday()) # Monday
        week_days = []
        for i in range(7):
            d = add_days(start_of_week, i)
            week_days.append(d)

        calendar_data = {}
        for d in week_days:
            calendar_data[str(d)] = {
                "date": d,
                "label": formatdate(d, "EEE"),
                "day": formatdate(d, "d"),
                "count": 0,
                "is_today": d == today()
            }

        # Match jobs to days and calculate summary stats
        total_open = 0
        awaiting_parts = 0
        completed_today = 0
        
        for j in jobs:
            j_date = str(getdate(j.creation))
            if j_date in calendar_data:
                calendar_data[j_date]["count"] += 1
            
            # KPI logic
            status = (j.get("status") or j.get("workflow_state") or "").lower()
            if status != "closed" and j.docstatus < 2:
                total_open += 1
            if status == "awaiting parts":
                awaiting_parts += 1
            if status == "closed" and j_date == str(today()):
                completed_today += 1

        return {
            "jobs": jobs,
            "calendar": list(calendar_data.values()),
            "summary": {
                "total": len(jobs),
                "today": calendar_data.get(today(), {}).get("count", 0),
                "open": total_open,
                "awaiting_parts": awaiting_parts,
                "completed_today": completed_today
            }
        }

    except Exception as e:
        return {"error": str(e), "traceback": frappe.get_traceback()}

@frappe.whitelist(allow_guest=True)
def get_job_card_detail(name):
    """
    Fetch full detail of a Job Card including child tables.
    """
    try:
        if not name:
            return {"error": "Missing Job Card name"}
            
        doc = frappe.get_doc("FT Job Card", name)
        
        # We need to manually serialize child tables if they aren't automatically included
        # job_items and parts (assuming name)
        
        return {
            "name": doc.name,
            "customer_name": doc.customer_name,
            "site__location": doc.site__location,
            "job_no": doc.get("job_no"),
            "machine_make": doc.machine_make,
            "model": doc.model,
            "vin_number": doc.vin_number,
            "technician": doc.technician,
            "job_description": doc.job_description,
            "causes_of_failure": doc.get("causes_of_failure"),
            "remedy__details_of_workdone": doc.get("remedy__details_of_workdone"),
            "operator": doc.get("operator"),
            "last_service": doc.get("last_service"),
            "hmr": doc.get("hmr"),
            "customer_ref": doc.get("customer_ref"),
            "vehicle_registration": doc.get("vehicle_registration"),
            "creation": doc.creation,
            "docstatus": doc.docstatus,
            "job_items": doc.get("job_items") or [],
            "parts": doc.get("parts") or []
        }

    except Exception as e:
        return {"error": str(e), "traceback": frappe.get_traceback()}

@frappe.whitelist(allow_guest=True)
def save_job_card_detail(doc_json):
    """
    Save updated Job Card details.
    """
    try:
        import json
        data = json.loads(doc_json)
        
        if not data.get("name"):
            return {"error": "Missing Job Card name"}
            
        doc = frappe.get_doc("FT Job Card", data["name"])
        
        # Update main fields (only editable ones)
        fields_to_update = [
            "job_description", "causes_of_failure", "remedy__details_of_workdone",
            "technician", "vehicle_registration"
        ]
        
        for field in fields_to_update:
            if field in data:
                doc.set(field, data[field])
        
        # Update child tables if provided
        if "job_items" in data:
            doc.set("job_items", data["job_items"])
            
        if "parts" in data:
            doc.set("parts", data["parts"])
            
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {"message": "Success", "name": doc.name}

    except Exception as e:
        return {"error": str(e), "traceback": frappe.get_traceback()}

@frappe.whitelist(allow_guest=True)
def create_ft_job_card(machine, job_description, technician=None, hmr=None):
    """
    Create a new FT Job Card.
    """
    try:
        if not machine or not job_description:
            return {"error": "Machine and Job Description are required"}
            
        # Validate Machine
        if not frappe.db.exists("FT Machine", machine):
            return {"error": f"Machine '{machine}' not found"}
            
        machine_doc = frappe.get_doc("FT Machine", machine)
        
        doc = frappe.new_doc("FT Job Card")
        doc.machine__make_sn = machine
        doc.job_description = job_description
        doc.technician = technician
        doc.hmr = hmr
        
        # Auto-fill from Machine
        doc.customer_name = machine_doc.customer
        doc.model = machine_doc.model
        doc.vin_number = machine_doc.vin_number
        doc.site__location = machine_doc.location
        doc.job_date = today()
        
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {"ok": True, "name": doc.name}
        
    except Exception as e:
        frappe.log_error("Create Job Card Failed", str(e))
        return {"error": str(e)}
