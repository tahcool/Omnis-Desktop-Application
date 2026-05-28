import frappe


# noinspection PyUnresolvedReferences
def update_days_since_last_hmr():
    for rec in frappe.db.get_list("FT Machine", pluck="name"):
        machine = frappe.get_doc("FT Machine", rec)
        machine.update_days_since_last_hmr(machine.current_hmr)

        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)


# noinspection PyUnresolvedReferences
def perform_lib_and_field_checks():
    for rec in frappe.db.get_list(
        "FT Machine",
        filters={
            "supplied": "Yes",
        },
        pluck="name",
    ):
        doc = frappe.get_doc("FT Machine", rec)
        doc.perform_library_check()
        doc.perform_field_checks()
