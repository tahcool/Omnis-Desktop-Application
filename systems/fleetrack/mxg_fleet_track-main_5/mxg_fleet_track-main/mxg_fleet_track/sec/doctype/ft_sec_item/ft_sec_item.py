# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTSECItem(Document):
    def before_save(self):
        if self.repair_ref:
            self.in_stock = 1
