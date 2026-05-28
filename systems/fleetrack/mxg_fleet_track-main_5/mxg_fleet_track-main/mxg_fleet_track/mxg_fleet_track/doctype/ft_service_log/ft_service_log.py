# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, format_date


class FTServiceLog(Document):
    def validate(self):
        self.validate_hmr()

    def after_insert(self):
        self.do_calculations()

    def on_update(self):
        self.do_calculations()

    def do_calculations(self):
        machine = frappe.get_doc("FT Machine", self.machine)

        if machine.track_initial_service == "Yes":
            if self.service_type == machine.initial_service_type:
                self.toggle_initial_service_done(machine)

        self.set_service_history(machine)

        machine.set_hours_remaining_to_service()
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

        frappe.enqueue_doc(
            "FT Service Log",
            self.name,
            "clear_alerts",
            queue="short",
        )

    # noinspection PyUnresolvedReferences
    def set_service_history(self, machine):
        machine.load_from_db()
        machine.last_service_date = self.service_date
        machine.last_service_hmr = self.service_hmr
        machine.last_service_type = self.service_type

        # Calculate next service HMR
        service_interval_hours = machine.service_interval_hours

        next_service_hmr = self.service_hmr + service_interval_hours

        machine.next_service_hmr = next_service_hmr
        machine.next_service_type = self.service_type + service_interval_hours
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences
    def reverse_service_history(self, machine):
        """
        TODO if service type == initial,then set back to init
        :param machine:
        :return:
        """
        machine.last_service_date = self.previous_service_date
        machine.last_service_hmr = self.previous_service_hmr
        machine.next_service_hmr = self.service_hmr - machine.service_interval_hours
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences,PyMethodMayBeStatic
    def toggle_initial_service_done(self, machine):
        machine.load_from_db()
        if machine.initial_service_status == "Pending":
            machine.initial_service_status = "Done"
        elif machine.initial_service_status == "Done":
            machine.initial_service_status = "Pending"
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences
    def validate_hmr(self):
        machine = frappe.get_doc("FT Machine", self.machine)
        if self.service_hmr < machine.current_hmr:
            frappe.throw(
                f"""
            HMR cannot be less than or equal to {machine.current_hmr}
            """
            )

        if machine.last_service_date:
            if getdate(self.service_date) < getdate(machine.last_service_date):
                frappe.throw(
                    f"""
                            HMR date cannot be before {format_date(machine.last_service_date)}
                            """
                )

    # noinspection PyUnresolvedReferences
    def clear_alerts(self):
        afs = {
            "alert_type": [
                "in",
                [
                    "Quote Alert",
                    "Quote Follow Up",
                    "Maintenance Warning",
                    "Stop Machine",
                ],
            ],
            "machine": self.machine,
        }

        for a in frappe.get_all("FT Alert", afs, pluck="name"):
            frappe.db.set_value("FT Alert", a, "status", "Done")
