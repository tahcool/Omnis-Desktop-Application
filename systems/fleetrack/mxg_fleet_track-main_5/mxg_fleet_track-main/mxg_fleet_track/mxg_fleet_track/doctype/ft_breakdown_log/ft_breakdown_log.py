# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today


class FTBreakdownLog(Document):

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
        self.update_days_on_bd()

    def on_update(self):
        self.update_days_on_bd()

    # noinspection PyUnresolvedReferences
    def update_days_on_bd(self):
        if self.end_date:
            diff = getdate(self.end_date) - getdate(self.breakdown_date)
        else:
            diff = getdate(today()) - getdate(self.breakdown_date)

        frappe.db.set_value("FT Breakdown Log", self.name, "days_on_bd", diff.days)

    # noinspection PyUnresolvedReferences
    def validate_dates(self):
        if self.end_date:
            if getdate(self.end_date) < getdate(self.breakdown_date):
                frappe.throw("""
                    End date cannot be before the Breakdown Date!
                """)
