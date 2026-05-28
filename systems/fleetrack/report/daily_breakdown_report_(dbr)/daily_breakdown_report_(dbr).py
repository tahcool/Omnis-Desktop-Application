# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd
import datetime
import frappe


def get_dataframe(filters=None):
    sql = f"""SELECT 
        bd.customer as "Customer",
        bd.model as Model,
        bd.machine as "SN",
        ma.current_hmr as "HMR",
        ma.region as "Region",
        DATE_FORMAT(bd.breakdown_date, "%e %b. %Y" ) as "Date",
        bd.description as "Description",
        bd.status as "Status",
        DATEDIFF(NOW(), bd.breakdown_date) as "Days on BD",
        DATE_FORMAT(bd.parts_eta, "%e %b. %Y") as "Parts ETA",
        bd.warranty_status as "Warranty Status",
        bd.on_hold as "On Hold",
        bd.ted_status as "Ted Status",
        DATE_FORMAT(bd.ted, "%e %b. %Y") as "Ted",
        DATE_FORMAT(bd.red, "%e %b. %Y") as "Red",
        bd.is_the_machine_still_running as "Machine Running?"
    FROM `tabFT Breakdown Log` bd
    LEFT JOIN `tabFT Machine` ma ON bd.machine = ma.name
    WHERE bd.end_date IS NULL AND ma.region = "{filters.get("region")}"
    ORDER BY bd.breakdown_date DESC
    """
    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        date_columns = [
            "Ted",
            "Red",
            "Parts ETA",
            "Date",
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
