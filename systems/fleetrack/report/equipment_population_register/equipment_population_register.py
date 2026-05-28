# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe


def get_columns():
    return [
        {
            'fieldname': 'Customer',
            'fieldtype': "Link",
            'label': 'Customer',
            'width': 250,
            "options": "FT Customer"
        },{
            'fieldname': 'Model',
            'fieldtype': "Data",
            'label': 'Model',
            'width': 150,
        },
        {
            'fieldname': 'SN',
            'fieldtype': "Link",
            'label': 'SRN',
            'width': 140,
            "options": "FT Machine"
        },
        {
            'fieldname': 'Type',
            'fieldtype': "Data",
            'label': 'Type',
            'width': 100,
        },
        {
            'fieldname': 'Fleet No',
            'fieldtype': "Data",
            'label': 'Fleet No',
            'width': 100,
        },
        {
            'fieldname': 'Customer Ref',
            'fieldtype': "Data",
            'label': 'Customer Ref',
            'width': 200,
        },
        {
            'fieldname': 'Location',
            'fieldtype': "Data",
            'label': 'Location',
            'width': 185,
        },
    ]


# noinspection SqlDialectInspection,PyUnresolvedReferences
def get_data(filters=None):

    sql = f"""SELECT 
                    ma.customer as "Customer",
                    ma.model as Model,
                    ma.sn as "SN",
                    ma.type as "Type",
                    ma.mxg_fleet_no as "Fleet No",
                    ma.fleet_no as "Customer Ref",
                    ma.location as Location
                    FROM `tabFT Machine` ma
                    WHERE ma.supplied = 'Yes' ORDER BY mxg_fleet_no DESC;"""

    data = frappe.db.sql(sql, as_list=1)

    return data


def execute(filters=None):
    columns, data = get_columns(), get_data(filters)
    return columns, data
