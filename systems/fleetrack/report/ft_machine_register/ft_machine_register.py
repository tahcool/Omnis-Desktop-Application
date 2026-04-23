# Copyright (c) 2026, Fleetrack and contributors
# For license information, please see license.txt

import pandas as pd
import frappe


def get_dataframe(filters=None):
    """
    Fetch machine data from database and return as pandas DataFrame
    """
    sql = """SELECT 
        ma.name as "Machine ID",
        ma.mxg_fleet_no as "Fleet No",
        ma.fleet_no as "Customer Ref",
        ma.customer as "Customer",
        ma.model as "Model",
        ma.name as "Serial Number",
        ma.current_hmr as "Current HMR",
        ma.location as "Location",
        ma.region as "Region",
        ma.status as "Status",
        ma.warranty_status as "Warranty Status",
        DATE_FORMAT(ma.commission_date, "%d/%m/%Y") as "Commission Date",
        DATE_FORMAT(ma.warranty_expiry, "%d/%m/%Y") as "Warranty Expiry"
        FROM `tabFT Machine` ma
        WHERE 1=1
    """
    
    # Apply filters
    if filters:
        if filters.get("region"):
            sql += f" AND ma.region = '{filters.get('region')}'"
        
        if filters.get("status"):
            sql += f" AND ma.status = '{filters.get('status')}'"
        
        if filters.get("customer"):
            sql += f" AND ma.customer = '{filters.get('customer')}'"
        
        if filters.get("warranty_status"):
            sql += f" AND ma.warranty_status = '{filters.get('warranty_status')}'"
    
    sql += " ORDER BY ma.region, ma.customer, ma.mxg_fleet_no"
    
    data = frappe.db.sql(sql, as_dict=True)
    df = pd.DataFrame.from_records(data)
    
    # Process date columns if dataframe is not empty
    if not df.empty:
        date_columns = ["Commission Date", "Warranty Expiry"]
        df[date_columns] = df[date_columns].apply(
            lambda x: pd.to_datetime(x, errors="coerce").dt.date
        )
        df[date_columns] = df[date_columns].replace({pd.NaT: None})
        
        # Format dates back to string for display
        def format_date(dd):
            if isinstance(dd, pd.Timestamp):
                return dd.strftime("%d/%m/%Y")
            elif dd is not None:
                return str(dd)
            return ""
        
        for col in date_columns:
            df[col] = df[col].apply(format_date)
    
    return df


def get_data(df, filters=None):
    """
    Convert DataFrame to list of lists for Frappe
    """
    if df.empty:
        return []
    return df.values.tolist()


def get_columns(df, filters=None):
    """
    Generate column definitions from DataFrame
    """
    if df.empty:
        return []
    
    # Define custom widths for specific columns
    column_widths = {
        "Machine ID": 150,
        "Fleet No": 100,
        "Customer Ref": 120,
        "Customer": 180,
        "Model": 150,
        "Serial Number": 150,
        "Current HMR": 100,
        "Location": 150,
        "Region": 100,
        "Status": 120,
        "Warranty Status": 140,
        "Commission Date": 120,
        "Warranty Expiry": 120,
    }
    
    cols = [
        {
            "fieldname": col,
            "fieldtype": "Data",
            "label": str(col).title(),
            "width": column_widths.get(col, 120),
        }
        for col in df.columns
    ]
    return cols


def execute(filters=None):
    """
    Main entry point for the report
    Returns: (columns, data) tuple
    """
    df = get_dataframe(filters=filters)
    return get_columns(df, filters), get_data(df, filters)
