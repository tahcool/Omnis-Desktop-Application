# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTMachineUniqueAttachment(Document):
    def after_insert(self):
        machine = frappe.get_doc("FT Machine", self.machine)
        machine.unique_attachments_fitted += 1
        machine.save()
