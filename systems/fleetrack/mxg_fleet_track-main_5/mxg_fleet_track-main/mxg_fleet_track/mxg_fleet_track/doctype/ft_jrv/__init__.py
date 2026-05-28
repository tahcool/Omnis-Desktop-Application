import frappe
from frappe.utils import getdate


def update_days_on_current_stage_for_jrv():
    for row in frappe.get_all(
        "FT JRV",
        filters={"workflow_state": ["not in", ["Completed", "Lost"]]},
        fields=["name", "days_on_current_stage", "creation"],
    ):
        jrv_name, current_days, created_on = (
            row["name"],
            row["days_on_current_stage"],
            row["creation"],
        )
        days_running = (getdate() - getdate(created_on)).days
        frappe.db.sql(
            f"""
            UPDATE 
                `tabFT JRV` jrv 
            SET 
                days_on_current_stage = {current_days + 1},
                days_running = {days_running}
            WHERE name = '{jrv_name}'
            """
        )
