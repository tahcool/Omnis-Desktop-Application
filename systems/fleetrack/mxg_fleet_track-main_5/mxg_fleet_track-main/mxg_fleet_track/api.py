# apps/mxg_fleet_track/mxg_fleet_track/api.py

import frappe
from frappe.utils.file_manager import save_file

@frappe.whitelist(allow_guest=False)
def upload_zip(doctype, docname, filedata, filename, is_private=0):
    """
    Save a Base64-encoded ZIP and attach it to the given document.
    """
    # save_file signature: save_file(fname, content, dt=None, dn=None, folder=None, is_private=0, decode=False)
    file_doc = save_file(
        filename,       # fname
        filedata,       # content (Base64 string)
        dt=doctype,     # doc type
        dn=docname,     # doc name
        folder=None,
        is_private=bool(int(is_private)),
        decode=True     # decode the Base64 for us
    )
    return {
        "file_url": file_doc.file_url,
        "file_name": file_doc.file_name,
        "name": file_doc.name
    }

# ------------------------------
# ADDITIONAL FUNCTION TO CREATE DEFECT LOGS (triggered via hooks)
# ------------------------------

def create_defect_logs_from_job_card(doc, method):
    """
    Hook method: Called via on_update of FT Job Card.
    Iterates through job_items and creates FT Defects Log entries.
    """
    for row in doc.job_items:
        if not (row.defect_type and row.start_date and row.category):
            continue  # Skip incomplete rows

        # Prevent duplicate based on esn + category + date
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
        defect.insert()
