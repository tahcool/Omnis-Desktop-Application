import frappe


# noinspection PyUnresolvedReferences
def update_days_on_bd():
    for rec in frappe.db.get_list("FT Breakdown Log", filters={
        "end_date": ["is", "not set"],
    }, pluck='name'):
        doc = frappe.get_doc("FT Breakdown Log", rec)
        doc.update_days_on_bd()
