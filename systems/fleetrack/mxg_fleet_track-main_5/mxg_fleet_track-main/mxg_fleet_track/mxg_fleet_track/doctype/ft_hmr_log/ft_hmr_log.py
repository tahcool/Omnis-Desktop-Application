# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils.user import get_user_fullname
from frappe.utils import getdate, format_date, flt


class FTHMRLog(Document):
    # noinspection PyAttributeOutsideInit,PyUnresolvedReferences
    def before_save(self):
        self.logger = get_user_fullname(frappe.session["user"])
        if flt(self.hmr) < flt(self.hmr_on_log):
            self.op_hours = flt(self.hmr)
        else:
            self.op_hours = flt(self.hmr) - flt(self.hmr_on_log)

        if self.fuel_consumed:
            if self.prov_op_hours:
                self.fuel_consumption = self.fuel_consumed / self.prov_op_hours
            else:
                self.fuel_consumption = self.fuel_consumed / self.op_hours

    def validate(self):
        self.validate_hmr()
        self.validate_telemetry()

    # noinspection PyUnresolvedReferences
    def validate_hmr(self):
        machine = frappe.get_doc("FT Machine", self.machine)
        # if self.hmr < machine.current_hmr:
        #     frappe.throw(f"""
        #     HMR cannot be less than or equal to {machine.current_hmr}
        #     """)

        if machine.last_hmr_date:
            if getdate(self.reading_date) < getdate(machine.last_hmr_date):
                frappe.throw(
                    f"""
                            HMR date cannot be before {format_date(machine.last_hmr_date)}
                            """
                )

    # noinspection PyUnresolvedReferences
    def validate_telemetry(self):
        # if self.has_telemetry == "Yes":
        #     if self.ignition_on + self.engine_on + self.operation != self.op_hours:
        #         frappe.throw(f"""
        #         Engine On + Ignition On + Operation must equal {self.op_hours}
        #         """)
        ...

    # noinspection PyUnresolvedReferences
    def after_insert(self):
        """
        Update machine:
            - current_hmr

        :return:
        """

        machine = frappe.get_doc("FT Machine", self.machine)
        machine.update_current_hmr(self.hmr, self.reading_date, self.name)
        machine.set_hours_remaining_to_service()
        machine.update_running_hours()
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

        settings = frappe.get_doc("Fleetrack Settings")
        alert_after = settings.send_alert_for_hmr_after

        if machine.days_since_last_hmr < int(alert_after.split()[0]):
            frappe.enqueue_doc(
                "FT HMR Log",
                self.name,
                "clear_alerts",
                queue="short",
            )

    # noinspection PyUnresolvedReferences
    def clear_alerts(self):
        afs = {
            "alert_type": "HMR Alert",
            "machine": self.machine,
        }
        for a in frappe.get_all("FT Alert", afs, pluck="name"):
            frappe.db.set_value("FT Alert", a, "status", "Done")

    def on_update(self):
        """
        Update machine record
        :return:
        """

        # check if log is latest by date

        qs = frappe.db.sql(
            f"""
            SELECT name from `tabFT HMR Log` 
            WHERE machine='{self.machine}'
            ORDER BY reading_date DESC
        """
        )

        if qs and qs[0][0] == self.name:
            machine = frappe.get_doc("FT Machine", self.machine)
            machine.update_current_hmr(self.hmr, self.reading_date, self.name)
            machine.set_hours_remaining_to_service()

            machine.flags.ignore_mandatory = True
            machine.save(ignore_permissions=True, ignore_version=True)

            settings = frappe.get_doc("Fleetrack Settings")
            alert_after = settings.send_alert_for_hmr_after

            if machine.days_since_last_hmr < int(alert_after.split()[0]):
                frappe.enqueue_doc(
                    "FT HMR Log",
                    self.name,
                    "clear_alerts",
                    queue="short",
                )


def _sync_machine_total_running_hours(machine_sn=None):
    if machine_sn:
        raise NotImplementedError()

    for machine_name in frappe.db.get_all("FT Machine", pluck="name"):
        machine = frappe.get_doc("FT Machine", machine_name)
        machine.update_running_hours()
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)


@frappe.whitelist()
def sync_machine_total_running_hours(machine_sn=None):
    frappe.enqueue(
        _sync_machine_total_running_hours, queue="short", machine_sn=machine_sn
    )
