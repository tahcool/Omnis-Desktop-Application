# Copyright (c) 2025
# For license information, please see license.txt

import datetime
import frappe
import pandas as pd

# Correct DocType reference
DOCTYPE = "FT Maintenance Warning Report"
TABLE = f"`tab{DOCTYPE}`"


def get_dataframe(filters=None):
    # Pull unresolved records from FT Maintenance Warning Report
    sql = f"""
        SELECT
            w.customer AS "Customer",
            COALESCE(w.machine_model, m.model) AS "Model",
            COALESCE(w.engine_srn, m.sn) AS "SN",
            DATE_FORMAT(w.date_of_issue, "%%e %%b. %%Y") AS "Date",
            w.mwr_mode AS "Mode",
            w.description AS "Description",
            CASE WHEN w.date_resolved IS NULL THEN "Open" ELSE "Resolved" END AS "Status",
            DATEDIFF(CURDATE(), w.date_of_issue) AS "Days Elapsed",
            DATE_FORMAT(w.date_resolved, "%%e %%b. %%Y") AS "Date Resolved",
            w.site_where_applicable AS "Site",
            w.customer_ref AS "Customer Ref",
            w.fleet_no AS "Fleet No",
            w.engine_make AS "Engine Make",
            w.total_running_hours AS "Total Running Hours",
            w.current_hmr AS "Current HMR",
            w.warranty_violation AS "Warranty Violation",
            w.advisory AS "Advisory",
            w.overdue_maintenance AS "Overdue Maintenance",
            w.other AS "Other",
            w.major_defects AS "Major Defect(s)"
        FROM {TABLE} w
        LEFT JOIN `tabFT Machine` m ON m.name = w.machine
        WHERE w.date_resolved IS NULL
        ORDER BY w.date_of_issue ASC
    """
    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        date_columns = ["Date", "Date Resolved"]
        df[date_columns] = df[date_columns].apply(
            lambda x: pd.to_datetime(x, errors="coerce").dt.date
        )
        df[date_columns] = df[date_columns].replace({pd.NaT: None})

        # Percent of warnings under 30 days old
        below_30 = df[df["Days Elapsed"] < 30]
        efficiency_str = f"{(len(below_30) / len(df) * 100):.1f}%"
        df["efficiency"] = efficiency_str

        def pretty_date(d):
            if isinstance(d, datetime.date):
                return d.strftime("%d/%m/%Y")
            return d

        for col in date_columns:
            df[col] = df[col].apply(pretty_date)

        # Build a compact "Flags" string from boolean checks
        flag_cols = [
            "Warranty Violation",
            "Advisory",
            "Overdue Maintenance",
            "Other",
            "Major Defect(s)",
        ]

        def mk_flags(row):
            active = [label for label in flag_cols if row.get(label) in (1, True)]
            return ", ".join(active)

        df["Flags"] = df.apply(mk_flags, axis=1)
        df.drop(columns=flag_cols, inplace=True, errors="ignore")

    return df


def get_data(df, filters=None):
    # Keep as list-of-lists to mirror your WWU pattern
    return df.values.tolist()


def get_columns(df, filters=None):
    return [
        {"fieldname": col, "fieldtype": "Data", "label": str(col).title(), "width": 120}
        for col in df.columns
    ]


def execute(filters=None):
    df = get_dataframe(filters=filters)
    return get_columns(df, filters), get_data(df, filters)
