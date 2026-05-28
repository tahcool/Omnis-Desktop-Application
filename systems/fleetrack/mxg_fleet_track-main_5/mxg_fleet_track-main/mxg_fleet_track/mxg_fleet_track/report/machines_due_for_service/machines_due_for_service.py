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
            'fieldname': 'Fleet No',
            'fieldtype': "Data",
            'label': 'Fleet No.',
            'width': 90,
        },
        {
            'fieldname': 'SRN',
            'fieldtype': "Link",
            'label': 'SRN',
            'width': 90,
            "options": "FT Machine",
        },
        {
            'fieldname': 'Model',
            'fieldtype': "Data",
            'label': 'Model',
            'width': 170,
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
            'width': 120,
        },
        {
            'fieldname': 'Last Service Date',
            'fieldtype': "Date",
            'label': 'Last Service Date',
            'width': 120,
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

    ]


# noinspection SqlDialectInspection
def get_data(filters=None):
    sql = f"""SELECT 
                ma.customer as "Customer",
                ma.fleet_no as "Fleet No.",
                ma.sn as "SRN",
                ma.model as "Model",
                ma.location as "Location",
                ma.current_hmr as "Current Hours",
                ma.warranty_status as "Warranty Status",
                ma.hours_remaining_to_service as "Hours to Service",
                ma.last_service_hmr as "Last Service HMR",
                ma.last_service_date as "Last Service Date",
                ma.service_interval_hours as "Service Interval",
                ma.next_service_hmr as "Next Service HMR"
                FROM `tabFT Machine` ma WHERE ma.fleetrack_managed = 'Yes' and ma.hours_remaining_to_service <=0 ORDER BY ma.hours_remaining_to_service ASC"""

    data = frappe.db.sql(sql, as_list=1)

    return data


def get_chart_data(data):
    return None


def execute(filters=None):
    columns, data = get_cols(), get_data(filters)
    chart = get_chart_data(data)
    return columns, data, None, chart
