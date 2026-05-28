# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today


class SECRepairLogEntry(Document):
    # noinspection PyUnresolvedReferences
    def autoname(self):
        self.name = f"{self.description}-{frappe.generate_hash('', 3)}"

    def validate(self):
        self.validate_dates()

    # noinspection PyUnresolvedReferences
    def after_insert(self):
        """
        :return:
        """
        self.update_days_elapsed()

    def on_update(self):
        self.update_days_elapsed()

    # noinspection PyUnresolvedReferences
    def update_days_elapsed(self):
        if self.end_date:
            diff = getdate(self.end_date) - getdate(self.date_logged)
        else:
            diff = getdate(today()) - getdate(self.date_logged)

        frappe.db.set_value("SEC Repair Log Entry", self.name, "day_since_logged", diff.days)

    # noinspection PyUnresolvedReferences
    def validate_dates(self):
        if self.end_date:
            if getdate(self.end_date) < getdate(self.date_logged):
                frappe.throw("""End date cannot be before the date it was logged!""")
