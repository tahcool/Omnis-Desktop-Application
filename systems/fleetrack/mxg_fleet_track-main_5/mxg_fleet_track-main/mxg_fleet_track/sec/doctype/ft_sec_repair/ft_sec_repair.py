# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTSECRepair(Document):
    pass


@frappe.whitelist()
def scrap_component(ref): ...
