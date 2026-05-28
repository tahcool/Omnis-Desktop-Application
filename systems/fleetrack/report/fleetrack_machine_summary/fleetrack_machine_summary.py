# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe


def get_cols():
    return [
        {
            'fieldname': 'Customer',
            'fieldtype': "Link",
            'label': 'Customer',
            'width': 180,
            "options": "FT Customer"
        },
        {
            'fieldname': 'Customer Ref',
            'fieldtype': "Data",
            'label': 'Customer Ref',
            'width': 90,
        },
        {
            'fieldname': 'Fleet No',
            'fieldtype': "Data",
            'label': 'Fleet No',
            'width': 90,
        },
        {
            'fieldname': 'Machine Type',
            'fieldtype': "Data",
            'label': 'Type',
            'width': 90
        },
        {
            'fieldname': 'OEM',
            'fieldtype': "Link",
            'label': 'OEM',
            'width': 90,
            "options": "FT Machine OEM",
        },
        {
            'fieldname': 'Model',
            'fieldtype': "Data",
            'label': 'Model',
            'width': 200,
        },
        {
            'fieldname': 'SN',
            'fieldtype': "Link",
            'label': 'SN',
            'options': "FT Machine",
            'width': 130,
        },
        {
            'fieldname': 'Location',
            'fieldtype': "Data",
            'label': 'Location',
            'width': 100,
        }, {
            'fieldname': 'Current Hours',
            'fieldtype': "Float",
            'label': 'Current Hours',
            'width': 100,
        },
        {
            'fieldname': 'Warranty Status',
            'fieldtype': "Data",
            'label': 'Warranty Status',
            'width': 120,
        },
        {
            'fieldname': 'Hours to Service',
            'fieldtype': "Float",
            'label': 'Hours to Service',
            'width': 130,
        },
        {
            'fieldname': 'Last Service HMR',
            'fieldtype': "Float",
            'label': 'Last Service HMR',
            'width': 160,
        },
        {
            'fieldname': 'Last Service Type',
            'fieldtype': "Float",
            'label': 'Last Service Type',
            'width': 160,
        },
        {
            'fieldname': 'Last Service Date',
            'fieldtype': "Date",
            'label': 'Last Service Date',
            'width': 160,
        },
        {
            'fieldname': 'Service Interval',
            'fieldtype': "Float",
            'label': 'Service Interval',
            'width': 110,
        },
        {
            'fieldname': 'Next Service HMR',
            'fieldtype': "Float",
            'label': 'Next Service HMR',
            'width': 140,
        },
        {
            'fieldname': 'Next Service Type',
            'fieldtype': "Float",
            'label': 'Next Service Type',
            'width': 140,
        },

    ]


# noinspection SqlDialectInspection
def get_data(filters=None):
    sql = f"""SELECT 
                ma.customer as "Customer",
                ma.fleet_no as "Customer Ref",
                ma.mxg_fleet_no as "Fleet No.",
                ma.type as "Machine Type",
                ma.oem as "OEM",
                ma.model as "Model",
                ma.sn as "SN",
                ma.location as "Location",
                ma.current_hmr as "Current Hours",
                ma.warranty_status as "Warranty Status",
                ma.hours_remaining_to_service as "Hours to Service",
                ma.last_service_hmr as "Last Service HMR",
                ma.last_service_type as "Last Service Type",
                ma.last_service_date as "Last Service Date",
                ma.service_interval_hours as "Service Interval",
                ma.next_service_hmr as "Next Service HMR",
                ma.next_service_type as "Next Service Type"
                FROM `tabFT Machine` ma WHERE ma.fleetrack_managed = 'Yes'"""

    data = frappe.db.sql(sql, as_list=1)

    return data


def execute(filters=None):
    columns, data = get_cols(), get_data(filters)
    return columns, data
