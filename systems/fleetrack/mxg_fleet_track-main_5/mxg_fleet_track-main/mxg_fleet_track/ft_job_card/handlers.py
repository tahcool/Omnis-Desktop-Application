import frappe
from frappe.utils import getdate

def _first(*vals):
    for v in vals:
        if v not in (None, "", 0):
            return v
    return None

def _set(d, fieldname, value):
    if value not in (None, "", 0):
        d.set(fieldname, value)

def create_defects_logs(doc, method=None):
    rows = doc.get("job_items") or []
    if not rows:
        return

    # parent fields
    customer = doc.get("customer_name")
    machine_name = _first(doc.get("machine_make"), doc.get("vin_number"))  # both Link FT Machine in your schema
    model_link = doc.get("model")                  # Link FT Machine Model
    site_loc_text = doc.get("site__location")      # Data (not Link)

    # optional: pull machine for OEM / location fallback
    machine_doc = None
    if machine_name and frappe.db.exists("FT Machine", machine_name):
        machine_doc = frappe.get_doc("FT Machine", machine_name)

    # resolve FT Location link (prefer parent text if it matches an FT Location name)
    resolved_location = None
    if site_loc_text and frappe.db.exists("FT Location", site_loc_text):
        resolved_location = site_loc_text
    elif machine_doc and getattr(machine_doc, "location", None) and frappe.db.exists("FT Location", machine_doc.location):
        resolved_location = machine_doc.location

    meta_dlog = frappe.get_meta("FT Defects Log")
    child_to_target = ["defect_type", "start_date", "category", "description", "priority", "solution"]

    for row in rows:
        dlog = frappe.new_doc("FT Defects Log")

        # child → target
        for f in child_to_target:
            _set(dlog, f, row.get(f))

        # parent → target
        _set(dlog, "customer", customer)
        _set(dlog, "machine", machine_name)
        _set(dlog, "model", _first(model_link, getattr(machine_doc, "model", None)))
        if resolved_location:
            _set(dlog, "location", resolved_location)

        # OEM from machine (if present)
        if machine_doc and getattr(machine_doc, "oem", None):
            dlog.oem = machine_doc.oem

        # optional pass-throughs if both sides have the fields
        for fname in ("warranty_status", "fleetrack_managed", "on_hold", "ted_status"):
            if hasattr(doc, fname) and meta_dlog.has_field(fname) and getattr(doc, fname):
                dlog.set(fname, getattr(doc, fname))

        # computed days
        if dlog.get("start_date") and dlog.get("end_date"):
            try:
                dlog.defect_days = (getdate(dlog.end_date) - getdate(dlog.start_date)).days
            except Exception:
                pass

        # default status
        if meta_dlog.has_field("status") and not dlog.get("status"):
            dlog.status = "Open"

        # backlink (if those fields exist on FT Defects Log)
        if meta_dlog.has_field("reference_doctype"):
            dlog.reference_doctype = "FT Job Card"
        if meta_dlog.has_field("reference_name"):
            dlog.reference_name = doc.name
        if meta_dlog.has_field("reference_row"):
            dlog.reference_row = row.name

        dlog.insert(ignore_permissions=True)
