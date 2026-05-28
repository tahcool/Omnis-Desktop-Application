import frappe


# noinspection PyUnresolvedReferences
def update_defect_days():
    for rec in frappe.db.get_list("FT Defects Log", filters={
        "end_date": ["is", "not set"],
    }, pluck='name'):
        doc = frappe.get_doc("FT Defects Log", rec)
        doc.update_defect_days()
