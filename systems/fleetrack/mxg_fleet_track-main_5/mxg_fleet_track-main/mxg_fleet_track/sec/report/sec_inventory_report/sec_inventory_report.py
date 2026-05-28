# Copyright (c) 2024, Percival Rapha and contributors
# For license information, please see license.txt

import frappe


def get_columns(filters):
    return [
        {
            "label": "Component Name",
            "fieldname": "component_name",
            "fieldtype": "Data",
            "width": 450,
        },
        {
            "label": "Part Number",
            "fieldname": "part_number",
            "fieldtype": "Data",
            "width": 200,
        },
        {
            "label": "In Stock Qty",
            "fieldname": "in_stock_qty",
            "fieldtype": "Int",
            "width": 200,
        },
    ]


def get_data(filters):
    sql = """
	SELECT
		comp.component_name as component_name,
		comp.part_number as part_number,
		COUNT(jnl.name) AS in_stock_qty
	FROM
		`tabFT SEC Component` comp
	LEFT JOIN
		`tabFT SEC Item` jnl
	ON
		comp.name = jnl.component_reference
	WHERE
		jnl.in_stock = 1
	ORDER BY
		in_stock_qty DESC
	"""

    data = frappe.db.sql(sql, as_dict=True)
    return data


def execute(filters=None):
    columns, data = get_columns(filters), get_data(filters)
    return columns, data
