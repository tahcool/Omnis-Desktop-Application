# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt
from frappe.model.document import Document


class FTTrackandUndercarriageReport(Document):
    def set_percentage_worn(self):
        for item in self.get("components"):
            percentage_worn_left = flt(
                ((item.new_mm - item.measured_left) / item.new_mm) * 100, 2
            )
            percentage_worn_right = flt(
                ((item.new_mm - item.measured_right) / item.new_mm) * 100, 2
            )
            item.percentage_worn_left = percentage_worn_left
            item.percentage_worn_right = percentage_worn_right

    def before_save(self):
        self.set_percentage_worn()
