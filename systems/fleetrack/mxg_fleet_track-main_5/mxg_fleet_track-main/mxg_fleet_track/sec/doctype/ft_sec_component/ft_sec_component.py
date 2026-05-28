# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTSECComponent(Document):
    @frappe.whitelist()
    def get_component_stock_qty(cls, component_reference):
        in_stock_qty = frappe.db.count(
            "FT SEC Item",
            filters={"in_stock": 1, "component_reference": component_reference},
        )
        return in_stock_qty
