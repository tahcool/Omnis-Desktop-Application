# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import rounded


def get_columns():
    return [
        {
            "fieldname": "ID",
            "fieldtype": "Link",
            "label": "ID",
            "width": 100,
            "options": "Defects Log",
        },
        {
            "fieldname": "Client",
            "fieldtype": "Link",
            "label": "Client",
            "width": 180,
            "options": "Client",
        },
        {
            "fieldname": "Client Ref",
            "fieldtype": "Data",
            "label": "Ref",
            "width": 100,
        },
        {
            "fieldname": "Fleet No",
            "fieldtype": "Data",
            "label": "Fleet No.",
            "width": 180,
        },
        {
            "fieldname": "Technician",
            "fieldtype": "Link",
            "label": "Technician",
            "width": 180,
            "options": "Technician",
        },
        {
            "fieldname": "Reg No",
            "fieldtype": "Data",
            "label": "Reg No.",
            "width": 180,
        },
        {
            "fieldname": "Location",
            "fieldtype": "Data",
            "label": "Location",
            "width": 180,
        },
        {
            "fieldname": "Model",
            "fieldtype": "Data",
            "label": "Model",
            "width": 140,
        },
        {
            "fieldname": "Type",
            "fieldtype": "Data",
            "label": "Type",
            "width": 140,
        },
        {
            "fieldname": "LBZ",
            "fieldtype": "Link",
            "label": "LBZ",
            "width": 130,
            "options": "Truck",
        },
        {
            "fieldname": "Date",
            "fieldtype": "Date",
            "label": "Date",
            "width": 100,
        },
        {
            "fieldname": "Defect",
            "fieldtype": "Data",
            "label": "Defect",
            "width": 200,
        },
        {
            "fieldname": "Solution",
            "fieldtype": "Data",
            "label": "Solution for Defect",
            "width": 180,
        },
        {
            "fieldname": "Defect Status",
            "fieldtype": "Data",
            "label": "Status",
            "width": 120,
        },
        {
            "fieldname": "Defect Days",
            "fieldtype": "Int",
            "label": "Defect Days",
            "width": 100,
        },
        {
            "fieldname": "Priority",
            "fieldtype": "Data",
            "label": "Priority",
            "width": 100,
        },
        {
            "fieldname": "Warranty Status",
            "fieldtype": "Data",
            "label": "Warranty Status",
            "width": 100,
        },
        {
            "fieldname": "On Hold",
            "fieldtype": "Data",
            "label": "On Hold",
            "width": 125,
        },
        {
            "fieldname": "Ted Status",
            "fieldtype": "Data",
            "label": "Ted Status",
            "width": 125,
        },
        {
            "fieldname": "Ted",
            "fieldtype": "Date",
            "label": "TED for Defect",
            "width": 125,
        },
        {
            "fieldname": "Red",
            "fieldtype": "Date",
            "label": "RED",
            "width": 125,
        },
        {
            "fieldname": "Parts In Stock",
            "fieldtype": "Int",
            "label": "Parts In Stock",
            "width": 110,
        },
        {
            "fieldname": "Parts ETA",
            "fieldtype": "Date",
            "label": "Parts ETA",
            "width": 110,
        },
        {
            "fieldname": "JSD",
            "fieldtype": "Date",
            "label": "Job Start Date",
            "width": 110,
        },
        {
            "fieldname": "JED",
            "fieldtype": "Date",
            "label": "Job End Date",
            "width": 110,
        },
        {
            "fieldname": "dbted",
            "fieldtype": "Int",
            "label": "Days Before TED",
            "width": 110,
        },
        {
            "fieldname": "efficiency",
            "fieldtype": "Data",
            "label": "Efficiency",
            "width": 100,
        },
    ]


# noinspection SqlDialectInspection
def get_data(filters=None):
    region = filters.get("region") if filters else None
    
    # Use 'ma.location' as 'region' is likely missing on 'tabTruck'
    # 'ma' is aliased to 'tabTruck'
    sql = f"""SELECT 
                    de.name as "ID",
                    de.client as "Client",
                    COALESCE(ma.fleet_no, '-') as "Client Ref",
                    ma.fleet_no as "Fleet No",
                    de.technician as Technician,
                    ma.reg_number as "Reg No",
                    ma.location as "Location",
                    de.model as Model,
                    ma.type as Type,
                    de.lbz as "LBZ",
                    DATE_FORMAT(de.start_date, "%d %b %y") as "Date",
                    de.description as "Defect",
                    de.solution as Solution,
                    de.status as "Defect Status",
                    DATEDIFF(CURDATE(), de.start_date) as "Defect Days",
                    de.importance as Priority,
                    de.warranty_status as "Warranty Status",
                    de.on_hold as "On Hold",
                    de.ted_status as "Ted Status",
                    DATE_FORMAT(de.ted, "%d %b %y") as "Ted",
                    DATE_FORMAT(de.red, "%d %b %y") as "Red",
                    de.parts_in_stock as "Parts In Stock",
                    DATE_FORMAT(de.parts_eta, "%d %b %y") as "Parts ETA",
                    DATE_FORMAT(de.job_start_date, "%d %b %Y") as "JSD",
                    DATE_FORMAT(de.job_end_date, "%d %b %Y") as "JED",
                    COALESCE(DATEDIFF(de.ted, CURDATE()), 0) as "dbted"
                    FROM `tabDefects Log` de 
                    LEFT JOIN `tabTruck` ma ON de.lbz = ma.name
                    WHERE 
                        de.end_date IS NULL AND 
                        (de.defect_type = 'Major' OR de.importance = 'High') AND
                        (ma.location LIKE '%{region}%' OR "{region}" = "All")
                    ORDER BY de.defect_days DESC;
                    """

    try:
        data = frappe.db.sql(sql, as_dict=True)
    except Exception as e:
        frappe.log_error(f"MDR SQL Error: {str(e)}\n\nSQL: {sql}")
        raise e
    
    # Calculate efficiency without pandas
    total_records = len(data)
    if total_records > 0:
        db4ted_over_0 = sum(1 for item in data if item.get("dbted", 0) >= 0)
        efficiency_val = rounded((db4ted_over_0 / total_records) * 100, 1)
        efficiency_str = f"{efficiency_val:.1f}%"
    else:
        efficiency_str = "0.0%"

    # Add efficiency to each row for consistency with existing FE logic
    report_data = []
    for item in data:
        row = [
            item.get("ID"), item.get("Client"), item.get("Client Ref"), item.get("Fleet No"),
            item.get("Technician"), item.get("Reg No"), item.get("Location"), item.get("Model"),
            item.get("Type"), item.get("LBZ"), item.get("Date"), item.get("Defect"),
            item.get("Solution"), item.get("Defect Status"), item.get("Defect Days"),
            item.get("Priority"), item.get("Warranty Status"), item.get("On Hold"),
            item.get("Ted Status"), item.get("Ted"), item.get("Red"), item.get("Parts In Stock"),
            item.get("Parts ETA"), item.get("JSD"), item.get("JED"), item.get("dbted"),
            efficiency_str # Index 26
        ]
        report_data.append(row)

    return report_data


def execute(filters=None):
    try:
        columns, data = get_columns(), get_data(filters)
        return columns, data
    except Exception as e:
        import traceback
        frappe.log_error(f"MDR Execute Error: {str(e)}\n{traceback.format_exc()}")
        raise e
