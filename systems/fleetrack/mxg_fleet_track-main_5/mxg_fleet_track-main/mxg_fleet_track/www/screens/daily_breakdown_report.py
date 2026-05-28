import frappe
from frappe.utils import rounded

from mxg_fleet_track.www.screens import authenticate_aux

no_cache = 1


def get_context(context):
    if authenticate_aux(frappe.form_dict.get("aux_pin", "")):
        context.aux_auth = 1

    context.today = frappe.utils.today()
    context.aux_pin = frappe.form_dict.get("aux_pin", "")
    context.csrf_token = frappe.sessions.get_csrf_token()

    sql = f"""SELECT 
                bd.customer as "Customer",
                ma.fleet_no as "Customer Ref",
                ma.mxg_fleet_no as "Fleet No",
                bd.model as Model,
                bd.machine as "SN",
                bd.description as "Description",
                bd.status as "Status",
                bd.days_on_bd as "Days on BD",
                DATE_FORMAT(bd.parts_eta, "%e %b. %y") as "Parts ETA",
                DATE_FORMAT(bd.out_eta, "%e %b. %y") as "Outwork ETA",
                bd.warranty_status as "Warranty Status",
                DATE_FORMAT(bd.ted, "%e %b. %y") as "Ted",
                DATE_FORMAT(bd.red, "%e %b. %y") as "Red",
                COALESCE(DATEDIFF(bd.ted, CURDATE()), 0) as "dbted"
                FROM `tabFT Breakdown Log` bd
                LEFT JOIN `tabFT Machine` ma ON bd.machine = ma.name
                WHERE bd.end_date IS NULL and bd.resp = 'FSD'
                ORDER BY bd.ted ASC"""

    data = frappe.db.sql(sql, as_dict=1)

    db4ted_over_0 = len(list(filter(lambda i: i["dbted"] >= 0, data)))
    total_records = len(data)
    efficiency = rounded((db4ted_over_0 / total_records) * 100, 1)

    context.brd = data
    context.efficiency = efficiency

    return context
