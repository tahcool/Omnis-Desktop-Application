# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import datetime
import frappe
import pandas as pd


def get_dataframe(filters=None):
    sql = f"""SELECT 
        wc.customer as "Customer",
        wc.model as Model,
        wc.machine_srn as "SN",
        COALESCE(wc.warranty_oem, wc.oem) as "OEM",
        DATE_FORMAT(wc.date, "%e %b. %Y" ) as "Date",
        wc.description as "Description",
        wc.status as "Status",
        DATEDIFF(CURDATE(),wc.date) as "Days Elapsed",
        DATE_FORMAT(wc.parts_eta, "%e %b. %Y") as "Parts ETA",
        wc.oem_system_no as "OEM No",
        wc.tracking_number as "Tracking Number",
        wc.notes as "Notes"
        FROM 
            `tabFT Warranty Claim` wc
        WHERE 
            date_resolved is NULL
        ORDER BY 
            wc.date ASC"""
    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        date_columns = [
            "Parts ETA",
            "Date",
        ]
        df[date_columns] = df[date_columns].apply(
            lambda x: pd.to_datetime(x, errors="coerce").dt.date
        )
        df[date_columns] = df[date_columns].replace({pd.NaT: None})

        below_30_days = df[df["Days Elapsed"] < 30]
        df["efficiency"] = f"{len(below_30_days) / len(df) * 100:.1f}%"

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
