# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

NAMING_MATRIX = {
    "Quote Alert": lambda alert: f"{alert.machine}-QA-{alert.on_service_type}",
    "Quote Follow Up": lambda alert: f"{alert.machine}-QFU-{alert.on_service_type}",
    "Maintenance Warning": lambda alert: f"{alert.machine}-MW-{alert.on_service_type}",
    "Stop Machine": lambda alert: f"{alert.machine}-SM-{alert.on_service_type}",
    "HMR Alert": lambda alert: f"{alert.machine}-HMR-{alert.on_last_hmr}",
    "General": lambda alert: f"{alert.machine}-GEN-{alert.desc.upper()}",
}


class FTAlert(Document):

    # noinspection PyUnresolvedReferences
    def autoname(self):
        """

        :return:
        """
        self.name = NAMING_MATRIX[self.alert_type](self)

    def validate(self):
        self.validate_hmr()

    # noinspection PyUnresolvedReferences
    def validate_hmr(self):
        if self.alert_type in ["Quote Alert",
                               "Quote Follow Up",
                               "Maintenance Warning",
                               "Stop Machine"]:
            if self.on_service_type == 0:
                frappe.throw("""HMR cannot be Zero""")


@frappe.whitelist()
def update_quote(name, quote_no):
    frappe.db.set_value("FT Alert", name, "quote_no", quote_no)
    frappe.db.set_value("FT Alert", name, "status", "Done")


@frappe.whitelist()
def qfu_done(name, quote_no):
    frappe.db.set_value("FT Alert", name, "quote_no", quote_no)
    frappe.db.set_value("FT Alert", name, "status", "Done")


@frappe.whitelist()
def clear(name):
    frappe.db.set_value("FT Alert", name, "status", "Done")
