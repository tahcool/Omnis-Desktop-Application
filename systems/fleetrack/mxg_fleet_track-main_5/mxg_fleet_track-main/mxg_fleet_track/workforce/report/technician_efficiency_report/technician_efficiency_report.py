# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd

import frappe
from frappe.utils import getdate


def get_df(filters=None):
    sql = f"""
        SELECT
            tech.technician_name as "Technician",
            tech.site as "Site",
            tech.designation as "Designation",
            log.date as "Date",
            log.productive as "Productive",
            log.travel as "Travel",
            log.non_productive as "Non Productive",
            log.admin as "Admin",
            log.house_keeping as "House Keeping",
            log.billed as "Billed",
            log.total_billable as "Total Billable",
            log.total_non_billable as "Total Non Billable",
            log.efficiency as "Efficiency"
        FROM `tabFT Technician Hour Log` log
        LEFT JOIN `tabFT Technician` tech ON log.technician = tech.name
        WHERE log.date BETWEEN '{filters.get("from_date")}' AND '{filters.get("to_date")}'
        -- WHERE log.date BETWEEN '2023-08-25' AND '2023-09-25'
    """
    data = frappe.db.sql(sql, as_dict=True)

    df = pd.DataFrame.from_records(data)
    # check if df not empty

    # if len(df):
    # group by technician
    df = df.groupby(["Technician", "Site", "Designation"]).sum().reset_index()
    print(" Here nigga! ", df)

    # fmt efficiency as percentage
    df["Efficiency"] = df["Efficiency"].map("{:.2f}%".format)

    return df


def get_data(filters=None):
    df = get_df(filters)

    val = df.values.tolist()
    print("valssssssssssss ", df)
    return df.values.tolist()


def get_columns(filters=None):
    df = get_df(filters)

    return [
        {
            "label": col,
            "fieldname": col,
            "fieldtype": "Data",
            "width": 100,
        }
        for col in df.columns
    ]


def execute(filters=None):
    columns, data = get_columns(filters), get_data(filters)
    print("The data is ", data)
    return columns, data
