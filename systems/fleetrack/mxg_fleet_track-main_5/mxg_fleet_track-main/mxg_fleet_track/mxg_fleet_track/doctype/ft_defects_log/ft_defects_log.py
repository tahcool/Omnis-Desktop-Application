# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today


class FTDefectsLog(Document):
    # noinspection PyUnresolvedReferences
    def autoname(self):
        self.name = f"{self.description}-{frappe.generate_hash('', 3)}"

    def validate(self):
        self.validate_dates()

    # noinspection PyUnresolvedReferences
    def validate_dates(self):
        if self.end_date:
            if getdate(self.end_date) < getdate(self.start_date):
                frappe.throw(
                    f"""
                Defect End date cannot be before {self.start_date}
                """
                )

    # noinspection PyUnresolvedReferences
    def after_insert(self):
        """
        :return:
        """
        self.update_defect_days()

    def on_update(self):
        self.update_defect_days()

    # noinspection PyUnresolvedReferences
    def update_defect_days(self):
        if self.end_date:
            diff = getdate(self.end_date) - getdate(self.start_date)
        else:
            diff = getdate(today()) - getdate(self.start_date)

        frappe.db.set_value("FT Defects Log", self.name, "defect_days", diff.days)
