import frappe


def before_migrate():
    ...


def after_migrate():
    if not frappe.conf.developer_mode:
        frappe.db.sql(
            """
        DELETE FROM `tabWorkspace` WHERE module NOT IN ('MXG Fleet Track', 'SEC', "Workforce");
        """
        )
