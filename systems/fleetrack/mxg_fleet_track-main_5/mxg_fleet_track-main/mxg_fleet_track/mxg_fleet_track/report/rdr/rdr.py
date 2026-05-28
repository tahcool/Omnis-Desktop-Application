# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import pandas as pd
import datetime
import frappe


def get_dataframe(filters=None):
    settings = frappe.get_doc("Fleetrack Settings")
    srd = settings.srd_customer

    sql = f"""SELECT 
        de.customer as "Customer",
        ma.fleet_no as "Customer Ref",
        ma.mxg_fleet_no as "Fleet No",
        ma.location as "Location",
        de.model as Model,
        de.machine as "SN",
        ma.current_hmr as "HMR",
        DATE_FORMAT(de.start_date, "%e %b. %Y" ) as "Date",
        de.description as "Defect",
        de.defect_type as "Type",
        de.solution as Solution,
        de.status as "Defect Status",
        DATEDIFF(NOW(), de.start_date) as "Defect Days",
        de.priority as Priority,
        de.warranty_status as "Warranty Status",
        de.on_hold as "On Hold",
        de.ted_status as "Ted Status",
        DATE_FORMAT(de.ted, "%e %b. %Y" ) as "Ted",
        DATE_FORMAT(de.red, "%e %b. %Y" ) as "Red",
        DATE_FORMAT(de.parts_eta, "%e %b. %Y" ) as "Parts ETA"
        FROM `tabFT Defects Log` de 
    LEFT JOIN `tabFT Machine` ma ON de.machine = ma.name
    WHERE de.end_date IS NULL and de.customer = '{srd}' AND ma.region = "{filters.get("region")}"
    ORDER BY DATEDIFF(NOW(), de.start_date) DESC;
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
        # Start of Selection
        df[date_columns] = df[date_columns].replace({pd.NaT: None})
        if df["Ted"].isnull().all():
            efficiency = 1.0
        else:
            efficiency = len(df[df["Ted"] > datetime.datetime.now().date()]) / len(df)
        df["efficiency"] = f"{efficiency * 100:.1f}%"

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
