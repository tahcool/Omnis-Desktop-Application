# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

from . import Activity

import frappe


def get_columns():
    return [
        {
            'fieldname': 'Date',
            'fieldtype': "Date",
            'label': 'Date',
            'width': 100,
        }, {
            'fieldname': 'Type',
            'fieldtype': "Data",
            'label': 'Type',
            'width': 100,
        }, {
            'fieldname': 'Description',
            'fieldtype': "Data",
            'label': 'Description',
            'width': 300,
        }, {
            'fieldname': 'Status',
            'fieldtype': "Data",
            'label': 'Status',
            'width': 180,
        }, {
            'fieldname': 'SRN',
            'fieldtype': "Link",
            'label': 'SRN',
            'width': 150,
            'options': "FT Machine"
        }, {
            'fieldname': 'Model',
            'fieldtype': "Data",
            'label': 'Model',
            'width': 130,
        }, {
            'fieldname': 'Customer',
            'fieldtype': "Link",
            'label': 'Customer',
            'width': 200,
            'options': "FT Customer"
        },
    ]


def get_data(filters=None):
    ac = Activity()
    ac.process()
    return ac.get_data().to_dict('records')


def execute(filters=None):
    columns, data = get_columns(), get_data(filters)
    return columns, data
