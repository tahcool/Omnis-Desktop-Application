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
            ma.current_hmr as "HMR",
            de.model as Model,
            de.machine as "SN",
            de.start_date as "Date",
            de.description as "Defect",
            de.solution as Solution,
            de.status as "Defect Status",
            DATEDIFF(NOW(), de.start_date) as "Defect Days",
            de.priority as Priority,
            de.warranty_status as "Warranty Status",
            de.on_hold as "On Hold",
            de.ted_status as "Ted Status",
            de.ted as "Ted",
            de.red as "Red",
            de.parts_eta as "Parts ETA"
            FROM `tabFT Defects Log` de 
        LEFT JOIN `tabFT Machine` ma ON de.machine = ma.name
        WHERE de.end_date IS NULL and de.defect_type = 'Telematics Alert' and de.customer != '{srd}' AND ma.region = "{filters.get("region")}"
        ORDER BY DATEDIFF(NOW(), de.start_date) DESC;
    """

    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)

    if not df.empty:
        # Calculate efficiency before grouping
        ted_present = df[df["Ted"].notnull()]
        if len(ted_present):
            efficiency = len(
                ted_present[ted_present["Ted"] > datetime.datetime.now().date()]
            ) / len(ted_present)
            eff_val = f"{efficiency * 100:.1f}%"
        else:
            eff_val = "100.0%"

        # Format date columns to strings
        date_columns = ["Ted", "Red", "Parts ETA", "Date"]
        for col in date_columns:
            df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%d/%m/%Y").fillna("")

        # Pre-format TED Display for each individual row
        def format_ted(row):
            parts = []
            if row["On Hold"] == 1:
                parts.append("On Hold")
            if row["Ted"]:
                parts.append(str(row["Ted"]))
            if row["Ted Status"] != "Available" and row["Ted Status"]:
                parts.append(str(row["Ted Status"]))
            return " ".join(parts)

        df["TED_Display"] = df.apply(format_ted, axis=1)

        # Sort by Machine identifiers and then by Date/Defect Days to ensure grouping
        group_cols = ["SN", "Customer", "Model", "Fleet No"]
        df = df.sort_values(by=group_cols + ["Date"], ascending=[True, True, True, True, False])

        # Calculate rowspan for each machine group
        df["rowspan"] = 0
        df = df.reset_index(drop=True)
        
        last_machine = None
        current_group_start = 0
        
        for i in range(len(df)):
            current_machine = f"{df.iloc[i]['SN']}_{df.iloc[i]['Customer']}"
            if current_machine != last_machine:
                if last_machine is not None:
                    df.at[current_group_start, "rowspan"] = i - current_group_start
                last_machine = current_machine
                current_group_start = i
        
        # Set the rowspan for the last group
        if len(df) > 0:
            df.at[current_group_start, "rowspan"] = len(df) - current_group_start

        # Re-sort the entire result by the oldest defect day in each group if needed, 
        # but for simplicity we'll keep the current machine-based grouping order.
        # However, to match user's previous sorting, we should find the max defect days per group.
        df["max_days_in_group"] = df.groupby(["SN", "Customer"])["Defect Days"].transform("max")
        df = df.sort_values(by=["max_days_in_group", "SN", "Customer", "Defect Days"], ascending=[False, True, True, False])
        
        # After sorting, we MUST recalculate rowspans because the group order changed
        df["rowspan"] = 0
        df = df.reset_index(drop=True)
        last_machine = None
        current_group_start = 0
        for i in range(len(df)):
            current_machine = f"{df.iloc[i]['SN']}_{df.iloc[i]['Customer']}"
            if current_machine != last_machine:
                if last_machine is not None:
                    df.at[current_group_start, "rowspan"] = i - current_group_start
                last_machine = current_machine
                current_group_start = i
        if len(df) > 0:
            df.at[current_group_start, "rowspan"] = len(df) - current_group_start

        df = df.drop(columns=["max_days_in_group"])
        df["efficiency"] = eff_val

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
