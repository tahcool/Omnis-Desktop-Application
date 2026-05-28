# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FTCustomer(Document):

    def refresh_fleetrack_status(self):
        if frappe.db.exists("FT Machine", {
            "customer": self.name,
            "fleetrack_managed": "Yes",
        }):
            frappe.db.set_value("FT Customer", self.name, "on_fleetrack", "Yes")
        else:
            frappe.db.set_value("FT Customer", self.name, "on_fleetrack", "No")

    def on_update(self):
        pass
        # self.refresh_fleetrack_status()


# noinspection PyUnresolvedReferences
@frappe.whitelist()
def refresh_ft_status(customer):
    customer = frappe.get_doc("FT Customer", customer)
    customer.refresh_fleetrack_status()
    customer.load_from_db()
    return customer.on_fleetrack
