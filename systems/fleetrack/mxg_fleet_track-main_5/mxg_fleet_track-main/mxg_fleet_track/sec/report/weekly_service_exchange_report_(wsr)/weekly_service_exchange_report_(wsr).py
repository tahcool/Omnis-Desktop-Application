# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd
import frappe
import datetime


def get_dataframe(filters=None):
    sql = f"""SELECT
            ma.name as "ID", 
            bd.customer AS "Customer",
            ma.part_no AS "PartNo",
            ma.ref AS "Ref",
            ma.component_name AS "Component",
            ma.location AS "Location",
            bd.machine_model AS "Model",
            DATE_FORMAT(bd.date_logged, "%e %b. %y") AS "Date",
            bd.description AS "Description",
            bd.job_number AS "job_number",
            bd.status AS "Status",
            DATEDIFF(CURDATE(), bd.date_logged) AS "Days",
            DATE_FORMAT(bd.parts_eta, "%e %b. %y") AS "Parts ETA",
            DATE_FORMAT(bd.outwork_eta, "%e %b. %y") AS "Outwork ETA",
            bd.on_hold AS "On Hold",
            bd.ted_status AS "Ted Status",
            DATE_FORMAT(bd.ted, "%e %b. %y") AS "Ted",
            DATE_FORMAT(bd.red, "%e %b. %y") AS "Red"
        FROM 
            `tabSEC Repair Log Entry` bd
        LEFT JOIN 
            `tabSEC Item` ma ON bd.sec_item_no = ma.name
        WHERE 
            bd.end_date IS NULL
        ORDER BY 
            Days DESC
        """
    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        date_columns = [
            "Parts ETA",
            "Outwork ETA",
            "Date",
            "Ted",
            "Red",
        ]
        df[date_columns] = df[date_columns].apply(
            lambda x: pd.to_datetime(x, errors="coerce").dt.date
        )
        df[date_columns] = df[date_columns].replace({pd.NaT: None})

        ted_present = df[df["Ted"].notnull()]
        if len(ted_present):
            efficiency = len(
                ted_present[ted_present["Ted"] > datetime.datetime.now().date()]
            ) / len(ted_present)
            df["efficiency"] = f"{efficiency * 100:.1f}%"
        else:
            df["efficiency"] = "100.0%"

        def funx(dd):
            if type(dd) == datetime.date:
                dd = dd.strftime("%d/%m/%Y")
            return dd

        for col in date_columns:
            df[col] = df[col].apply(funx)

    return df


def get_data(df, filters=None):
    data = df.values.tolist()
    return data


def get_columns(df, filters=None):
    cols = [
        {
            "fieldname": col,
            "fieldtype": "Data",
            "label": str(col).title(),
            "width": 120,
        }
        for col in df.columns
    ]
    return cols


def execute(filters=None):
    df = get_dataframe(filters=filters)
    return get_columns(df, filters), get_data(df, filters)
