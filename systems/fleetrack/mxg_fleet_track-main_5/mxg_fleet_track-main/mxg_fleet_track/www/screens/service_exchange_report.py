import frappe
from frappe.utils import rounded

from mxg_fleet_track.www.screens import authenticate_aux

no_cache = 1


def get_context(context):
    if authenticate_aux(frappe.form_dict.get("aux_pin", "")):
        context.aux_auth = 1

    context.today = frappe.utils.today()
    context.aux_pin = frappe.form_dict.get("aux_pin", "")

    sql = f"""SELECT 
                bd.customer as "Customer",
                ma.ref as "Ref",
                ma.part_no as "PartNo",
                ma.component_name as "Component",
                bd.machine_model as Model,
                bd.description as "Description",
                bd.status as "Status",
                bd.day_since_logged as "Days",
                DATE_FORMAT(bd.parts_eta, "%e %b. %y") as "Parts ETA",
                DATE_FORMAT(bd.outwork_eta, "%e %b. %y") as "Outwork ETA",
                DATE_FORMAT(bd.ted, "%e %b. %y") as "Ted",
                DATE_FORMAT(bd.red, "%e %b. %y") as "Red",
                COALESCE(DATEDIFF(bd.ted, CURDATE()), 0) as "dbted"
                FROM `tabSEC Repair Log Entry` bd
                LEFT JOIN `tabSEC Item` ma ON bd.sec_item_no = ma.name
                WHERE bd.end_date IS NULL
                ORDER BY bd.ted ASC"""

    data = frappe.db.sql(sql, as_dict=1)

    db4ted_over_0 = len(list(filter(lambda i: i["dbted"] >= 0, data)))
    # print(db4ted_over_0, "\n\n\n\n\n\n\n", data)
    total_records = len(data) or 1
    efficiency = rounded((db4ted_over_0 / total_records) * 100, 1)

    context.sec = data
    context.efficiency = efficiency

    return context
