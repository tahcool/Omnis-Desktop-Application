# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTSECIssueForm(Document):
    def on_submit(self):
        self.deduct_items_from_stock()

    def deduct_items_from_stock(self):
        for item in self.items_ref:
            frappe.db.set_value("FT SEC Item", item.item_reference, "in_stock", 0)
