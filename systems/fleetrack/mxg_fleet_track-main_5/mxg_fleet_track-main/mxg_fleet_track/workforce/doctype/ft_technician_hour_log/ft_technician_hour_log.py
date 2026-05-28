# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTTechnicianHourLog(Document):
    def after_insert(self):
        self._set_total_billable()
        self._set_total_non_billable()
        # self._set_efficiency()
        self.save()

    def _set_total_billable(self):
        self.total_billable = self.productive + self.travel

    def _set_total_non_billable(self):
        self.total_non_billable = self.non_productive + self.admin + self.house_keeping

    # def _set_efficiency(self):
    #     self.efficiency = (self.total_billable / self.billed) * 100
