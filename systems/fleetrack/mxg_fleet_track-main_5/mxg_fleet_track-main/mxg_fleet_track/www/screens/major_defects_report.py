import frappe
from frappe.utils import rounded

from mxg_fleet_track.www.screens import authenticate_aux

no_cache = 1


def get_context(context):
    if authenticate_aux(frappe.form_dict.get("aux_pin", "")) or frappe.conf.developer_mode:
        context.aux_auth = 1

    context.today = frappe.utils.today()
    context.aux_pin = frappe.form_dict.get("aux_pin", "")

    settings = frappe.get_doc("Fleetrack Settings")
    srd = settings.srd_customer

    sql = f"""SELECT 
                de.customer as "Customer",
                ma.fleet_no as "Customer Ref",
                ma.mxg_fleet_no as "Fleet No",
                de.model as Model,
                de.machine as "SN",
                de.description as "Defect",
                de.status as "Defect Status",
                de.defect_days as "Defect Days",
                de.priority as Priority,
                de.warranty_status as "Warranty Status",
                de.ted as "Ted",
                de.parts_eta as "Parts ETA",
                DATE_FORMAT(de.red, "%e %b. %y") as "Red",
                COALESCE(DATEDIFF(de.ted, CURDATE()), 0) as "dbted"
                FROM 
                    `tabFT Defects Log` de 
                LEFT JOIN 
                    `tabFT Machine` ma ON de.machine = ma.name
                WHERE 
                    de.end_date IS NULL and 
                    de.defect_type = 'Major' and 
                    de.customer != '{srd}'
                ORDER BY de.ted ASC;
                """

    data = frappe.db.sql(sql, as_dict=1)

    db4ted_over_0 = len(list(filter(lambda i: i["dbted"] >= 0, data)))
    total_records = len(data)
    efficiency = rounded((db4ted_over_0 / total_records) * 100,1)

    context.mdr = data
    context.efficiency = efficiency

    return context
