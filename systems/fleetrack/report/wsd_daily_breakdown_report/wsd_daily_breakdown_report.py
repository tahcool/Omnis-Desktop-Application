# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import pandas as pd
import datetime
import frappe


def get_dataframe(filters=None):
    sql = f"""SELECT 
            bd.customer as "Customer",
            ma.fleet_no as "Customer Ref",
            ma.mxg_fleet_no as "Fleet No",
            ma.location as "Location",
            bd.model as Model,
            bd.machine as "SN",
            ma.current_hmr as "HMR",
            DATE_FORMAT(bd.breakdown_date, "%e %b. %y" ) as "Date",
            bd.description as "Description",
            bd.status as "Status",
            bd.resp as "Resp",
            DATEDIFF(NOW(), bd.breakdown_date) as "Days on BD",
            DATE_FORMAT(bd.parts_eta, "%e %b. %y") as "Parts ETA",
            DATE_FORMAT(bd.out_eta, "%e %b. %y") as "Outwork ETA",
            bd.warranty_status as "Warranty Status",
            bd.on_hold as "On Hold",
            bd.ted_status as "Ted Status",
            DATE_FORMAT(bd.ted, "%e %b. %y") as "Ted",
            DATE_FORMAT(bd.red, "%e %b. %y") as "Red"
        FROM `tabFT Breakdown Log` bd
        LEFT JOIN `tabFT Machine` ma ON bd.machine = ma.name
        WHERE bd.end_date IS NULL and bd.resp = 'WSD'
        ORDER BY bd.days_on_bd DESC"""

    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        date_columns = [
            "Ted",
            "Red",
            "Outwork ETA",
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
