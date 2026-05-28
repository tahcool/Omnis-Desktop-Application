# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import datetime

import frappe
from frappe.model.document import Document
from frappe.utils import today, getdate, flt, cint


class FTMachine(Document):
    # noinspection PyUnresolvedReferences,PyAttributeOutsideInit
    def after_insert(self):
        """
        If track_initial_service
            - set next_service HMR to initial_service_type

        :return:
        """
        if self.track_initial_service == "Yes":
            self.set_next_service_hmr_to_initial()

        if self.starting_hmr and self.starting_hmr > 0:
            self.current_hmr = self.starting_hmr
            self.update_next_service_hmr()
            self.save(ignore_permissions=True, ignore_version=True)

        self.set_hours_remaining_to_service()
        self.update_warranty_status()
        self.update_customer()

        if self.supplied == "Yes":
            self.set_fleet_no()

            frappe.enqueue_doc(
                "FT Machine",
                self.name,
                "perform_library_check",
                queue="short",
            )

            frappe.enqueue_doc(
                "FT Machine",
                self.name,
                "perform_field_checks",
                queue="short",
            )

        self.flags.ignore_mandatory = True
        self.save(ignore_permissions=True, ignore_version=True)

    def set_fleet_no(self):
        last = frappe.db.sql(
            """
            SELECT 
            mxg_fleet_no 
            FROM `tabFT Machine`
            WHERE mxg_fleet_no IS NOT NULL
            ORDER BY CAST(mxg_fleet_no AS unsigned)  DESC 
        """
        )
        fleet_no = 1

        if last:
            list_of_nos = sorted([cint(x[0]) for x in last])
            all_nos_in_range = list(range(list_of_nos[0], list_of_nos[-1] + 2))
            available_nos = list(set(all_nos_in_range).difference(set(list_of_nos)))

            fleet_no = available_nos[0] if available_nos else list_of_nos[0] + 1

        self.mxg_fleet_no = fleet_no

    def update_running_hours(self):
        """
        check HMR log:
        - if current_hmr is greater than all of "hmr" in Log, then use current_hmr
        - else use greatest in HMR log then add current_hmr
        """
        op_hours_sum = frappe.db.sql(
            f"""
            SELECT SUM(op_hours) as hours FROM `tabFT HMR Log`
            WHERE machine = "{self.name}"
        """,
            as_dict=1,
        )[0]["hours"]
        self.total_running_hours = op_hours_sum

    # noinspection PyUnresolvedReferences
    def update_customer(self):
        customer = frappe.get_doc("FT Customer", self.customer)
        customer.refresh_fleetrack_status()

    # noinspection PyUnresolvedReferences,PyAttributeOutsideInit
    def update_next_service_hmr(self):
        if (
            self.track_initial_service == "Yes"
            and self.initial_service_status == "Pending"
            and self.current_hmr < self.initial_service_type
        ):
            self.next_service_hmr = self.initial_service_type
        else:
            if (
                not self.next_service_hmr
                and self.service_interval_hours
                and self.last_service_hmr
            ):
                self.next_service_hmr = self.last_service_hmr - (
                    self.last_service_hmr % self.service_interval_hours
                )
                self.next_service_hmr += self.service_interval_hours

    # noinspection PyUnresolvedReferences,PyAttributeOutsideInit
    def set_next_service_hmr_to_initial(self):
        self.next_service_hmr = self.initial_service_type

    @frappe.whitelist()
    # noinspection PyUnresolvedReferences,PyAttributeOutsideInit
    def set_hours_remaining_to_service(self, commit=False):
        if (
            self.fleetrack_managed == "Yes"
            and self.next_service_hmr
            and self.current_hmr
        ):
            self.hours_remaining_to_service = self.next_service_hmr - self.current_hmr

            if commit:
                self.save(ignore_permissions=True, ignore_version=True)

            frappe.enqueue_doc(
                "FT Machine",
                self.name,
                "create_alerts",
                queue="short",
            )

    # noinspection PyUnresolvedReferences
    @property
    def hours_to_service(self):
        return self.hours_remaining_to_service

    # noinspection PyUnresolvedReferences
    def create_alerts(self):
        self.load_from_db()

        settings = frappe.get_doc("Fleetrack Settings")

        list_of_points = sorted(
            [
                settings.quote_alert,
                settings.quote_follow_up_alert,
                settings.maint_warning,
                settings.stop_machine_warning,
            ]
        )

        min_max = lambda l: (l[0], l[-1])
        min_max = min_max(list_of_points)

        range_list = list(range(int(min_max[0]), int(min_max[1] + 1)))

        if int(self.hours_to_service) in range_list:
            qf = {
                "machine": self.name,
                "alert_type": "Quote Alert",
                "on_service_type": self.next_service_hmr,
            }

            if frappe.db.exists("FT Alert", qf):
                qf.update({"status": "Pending"})

                if frappe.db.exists("FT Alert", qf):
                    # Just update issue date
                    frappe.db.set_value(
                        "FT Alert",
                        f"{self.name}-QA-{self.next_service_hmr}",
                        "date_issued",
                        today(),
                    )
                else:
                    # Skip, Done. If in range, create Follow Up
                    qf.update({"alert_type": "Quote Follow Up"})
                    qf.pop("status")

                    if frappe.db.exists("FT Alert", qf):
                        qf.update({"status": "Pending"})

                        if frappe.db.exists("FT Alert", qf):
                            frappe.db.set_value(
                                "FT Alert",
                                f"{self.name}-QFU-{self.next_service_hmr}",
                                "date_issued",
                                today(),
                            )

                    else:
                        # If in QF Range create Alert
                        if (
                            list_of_points[0]
                            < self.hours_to_service
                            <= settings.quote_follow_up_alert
                        ):
                            qfal = frappe.get_doc(
                                {
                                    "doctype": "FT Alert",
                                    "alert_type": "Quote Follow Up",
                                    "machine": self.name,
                                    "service_type": self.next_service_hmr,
                                    "date_issued": today(),
                                }
                            )
                            qfal.save(ignore_permissions=True, ignore_version=True)
            else:
                # No QA. Create
                qf.update(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                    }
                )
                qal = frappe.get_doc(qf)
                qal.save(ignore_permissions=True, ignore_version=True)

        # Check if in Maintenance Warning range
        maint_warning = (
            lambda hours: list_of_points[0] < hours <= settings.maint_warning
        )
        stop_machine = lambda hours: hours <= list_of_points[0]

        if maint_warning(self.hours_to_service):
            # Check if MW exists already
            mf = {
                "alert_type": "Maintenance Warning",
                "machine": self.name,
                "on_service_type": self.next_service_hmr,
            }
            if frappe.db.exists("FT Alert", mf):
                mf.update({"status": "Pending"})
                if frappe.db.exists("FT Alert", mf):
                    # update date_issued
                    frappe.db.set_value(
                        "FT Alert",
                        f"{self.name}-MW-{self.next_service_hmr}",
                        "date_issued",
                        today(),
                    )
            else:
                # create new
                mf.update(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                    }
                )
                mwal = frappe.get_doc(mf)
                mwal.save(ignore_permissions=True, ignore_version=True)

        if stop_machine(self.hours_to_service):
            mf = {
                "alert_type": "Maintenance Warning",
                "machine": self.name,
                "on_service_type": self.next_service_hmr,
                "status": "Pending",
            }
            if frappe.db.exists("FT Alert", mf):
                frappe.db.set_value(
                    "FT Alert",
                    f"{self.name}-MW-{self.next_service_hmr}",
                    "status",
                    "Done",
                )

            # check if SM/SF exists
            sf = {
                "alert_type": "Stop Machine",
                "machine": self.name,
                "on_service_type": self.next_service_hmr,
            }
            if frappe.db.exists("FT Alert", sf):
                sf.update({"status": "Pending"})
                if frappe.db.exists("FT Alert", sf):
                    # update date_issued
                    frappe.db.set_value(
                        "FT Alert",
                        f"{self.name}-SM-{self.next_service_hmr}",
                        "date_issued",
                        today(),
                    )
            else:
                # create new
                sf.update({"doctype": "FT Alert", "date_issued": today()})
                smal = frappe.get_doc(sf)
                smal.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyAttributeOutsideInit,PyUnresolvedReferences
    def update_days_since_last_hmr(self, hmr):
        if self.last_hmr_date:
            diff = getdate(today()) - getdate(self.last_hmr_date)
            self.days_since_last_hmr = diff.days

            settings = frappe.get_doc("Fleetrack Settings")
            alert_after = settings.send_alert_for_hmr_after

            if diff.days >= int(alert_after.split()[0]):
                frappe.enqueue_doc(
                    "FT Machine",
                    self.name,
                    "create_hmr_alert",
                    queue="short",
                    hmr=hmr,
                    days_since_last_hmr=diff.days,
                )

    # noinspection PyUnresolvedReferences
    @property
    def fleetrack(self):
        return self.fleetrack_managed == "Yes"

    def create_hmr_alert(self, hmr, days_since_last_hmr=1):
        return  # TODO: REMOVE/FIX Duplication Issue
        if self.fleetrack:
            if frappe.db.exists(
                "FT Alert",
                {
                    "machine": self.name,
                    "alert_type": "HMR Alert",
                },
            ):
                # Clear all/Old
                for a in frappe.get_all(
                    "FT Alert",
                    {
                        "machine": self.name,
                        "alert_type": "HMR Alert",
                        "status": "Pending",
                    },
                    pluck="name",
                ):
                    frappe.db.set_value("FT Alert", a, "status", "Done")

                # Then create new
                alert = frappe.get_doc(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                        "machine": self.name,
                        "alert_type": "HMR Alert",
                        "status": "Pending",
                        "on_last_hmr": hmr,
                        "days_since_last_hmr": days_since_last_hmr,
                    }
                )
                alert.save(ignore_permissions=True, ignore_version=True)
            else:
                alert = frappe.get_doc(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                        "machine": self.name,
                        "alert_type": "HMR Alert",
                        "status": "Pending",
                        "on_last_hmr": hmr,
                        "days_since_last_hmr": days_since_last_hmr,
                    }
                )
                alert.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences,PyAttributeOutsideInit
    def update_warranty_status(self):
        if self.expiry_date and self.current_hmr:
            current_date = getdate(today())
            warranty_expiry = getdate(self.expiry_date)

            expires = [
                warranty_expiry < current_date,
                self.warranty_hours < self.current_hmr,
            ]

            if any(expires):
                self.warranty_status = "Out of Warranty"
            else:
                self.warranty_status = "Under Warranty"

    def on_update(self):
        self.update_warranty_status()
        self.update_customer()

        if self.supplied == "Yes":
            frappe.enqueue_doc(
                "FT Machine",
                self.name,
                "perform_library_check",
                queue="short",
            )

            frappe.enqueue_doc(
                "FT Machine",
                self.name,
                "perform_field_checks",
                queue="short",
            )

    # noinspection PyAttributeOutsideInit
    def update_current_hmr(self, hmr, reading_date, log):
        self.current_hmr = hmr
        self.last_hmr_date = reading_date
        self.last_hmr_log = log
        self.update_days_since_last_hmr(hmr)

        self.flags.ignore_mandatory = True
        self.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences
    def perform_library_check(self):
        self.load_from_db()

        if not self.supplied == "Yes":
            return

        lib_checks = [
            any([self.belt_dimensions is None, self.belt_dimensions == ""]),
            any([self.filters_list is None, self.filters_list == ""]),
            any(
                [
                    self.equipment_information_form is None,
                    self.equipment_information_form == "",
                ]
            ),
            any(
                [self.hyd_filters_dimensions is None, self.hyd_filters_dimensions == ""]
            ),
            any([self.nei_checklist is None, self.nei_checklist == ""]),
            (
                any([self.pdi_checklist is None, self.pdi_checklist == ""])
                if str(self.engine_type).lower() == "cummins"
                else False
            ),
            any([self.wty_certificate is None, self.wty_certificate == ""]),
        ]

        alert_exists = frappe.db.exists(
            "FT Alert", f"{self.name}-GEN-INCOMPLETE-DOCUMENT-LIBRARY"
        )
        alert_obj = (
            frappe.get_doc("FT Alert", f"{self.name}-GEN-INCOMPLETE-DOCUMENT-LIBRARY")
            if alert_exists
            else None
        )

        if any(lib_checks):
            if alert_exists:
                val = {"date_issued": today()}
                if alert_obj.status == "Done":
                    val.update({"status": "Pending"})

                    alert_obj.update(val)
                else:
                    alert_obj.update(val)
                alert_obj.save(ignore_permissions=True, ignore_version=True)
            else:
                frappe.get_doc(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                        "machine": self.name,
                        "alert_type": "General",
                        "status": "Pending",
                        "desc": "INCOMPLETE-DOCUMENT-LIBRARY",
                    }
                ).save(ignore_permissions=True, ignore_version=True)
        else:
            if alert_exists and alert_obj.status != "Done":
                alert_obj.update({"status": "Done"})
                alert_obj.save(ignore_permissions=True, ignore_version=True)

    # noinspection PyUnresolvedReferences
    def perform_field_checks(self):
        self.load_from_db()
        if not self.supplied == "Yes":
            return

        alert_exists = frappe.db.exists(
            "FT Alert", f"{self.name}-GEN-SPECIFY-IF-MACHINE-IS-OEM-REGISTERED"
        )
        alert_obj = (
            frappe.get_doc(
                "FT Alert", f"{self.name}-GEN-SPECIFY-IF-MACHINE-IS-OEM-REGISTERED"
            )
            if alert_exists
            else None
        )

        if not self.oem_registered:
            if alert_exists:
                val = {"date_issued": today()}
                if alert_obj.status == "Done":
                    val.update({"status": "Pending"})

                    alert_obj.update(val)
                else:
                    alert_obj.update(val)
                alert_obj.save(ignore_permissions=True, ignore_version=True)
            else:
                frappe.get_doc(
                    {
                        "doctype": "FT Alert",
                        "date_issued": today(),
                        "machine": self.name,
                        "alert_type": "General",
                        "status": "Pending",
                        "desc": "SPECIFY-IF-MACHINE-IS-OEM-REGISTERED",
                    }
                ).save(ignore_permissions=True, ignore_version=True)
        else:
            if alert_exists and alert_obj.status != "Done":
                alert_obj.update({"status": "Done"})
                alert_obj.save(ignore_permissions=True, ignore_version=True)

    def get_linked_service_bulletins(self):
        return frappe.db.sql(
            f"""select b.name, b.subject, b.issued_by from `tabFT Service Bulletin` b JOIN `tabFT SB Models Applicable` m ON m.parent = b.name WHERE m.model = "{self.model}" """,
            as_dict=1,
        )


# noinspection PyUnresolvedReferences
@frappe.whitelist()
def toggle_fleetrack_status(sn):
    machine = frappe.get_doc("FT Machine", sn)
    if machine.fleetrack:
        machine.fleetrack_managed = "No"
    else:
        machine.fleetrack_managed = "Yes"
    machine.flags.ignore_mandatory = True
    machine.save(ignore_permissions=True, ignore_version=True)

    return sn


# noinspection PyUnresolvedReferences
@frappe.whitelist()
def generate_fleet_no(sn):
    machine = frappe.get_doc("FT Machine", sn)
    if not machine.mxg_fleet_no:
        machine.set_fleet_no()
        machine.flags.ignore_mandatory = True
        machine.save(ignore_permissions=True, ignore_version=True)

        message = (
            f"Fleet number {machine.mxg_fleet_no} assigned to machine. Reload form."
        )
    else:
        message = f"Machine has fleet number already: {machine.mxg_fleet_no}"
    return message


@frappe.whitelist()
def hmr_log_entry(
    machine,
    reading_date,
    hmr,
    hmr_on_log,
    has_telemetry,
    op_hours=None,
    prov_op_hours=None,
    fuel_consumed=None,
    ignition_on=None,
    engine_on=None,
    operation=None,
):
    """

    :param machine:
    :param reading_date:
    :param hmr:
    :param hmr_on_log:
    :param has_telemetry:
    :param op_hours:
    :param prov_op_hours:
    :param fuel_consumed:
    :param ignition_on:
    :param engine_on:
    :param operation:
    :return:
    """
    hle = frappe.get_doc(
        {
            "doctype": "FT HMR Log",
            "machine": machine,
            "reading_date": reading_date,
            "hmr": flt(hmr),
            "hmr_on_log": flt(hmr_on_log),
            "op_hours": flt(op_hours or 0),
            "prov_op_hours": flt(prov_op_hours or 0),
            "has_telemetry": has_telemetry,
            "fuel_consumed": flt(fuel_consumed or 0),
            "ignition_on": flt(ignition_on or 0),
            "engine_on": flt(engine_on or 0),
            "operation": (operation or 0),
        }
    )

    hle.insert()

    return hle.name


@frappe.whitelist()
def service_log_entry(
    machine, service_date, technician, service_hmr, service_type, notes
):
    sle = frappe.get_doc(
        {
            "doctype": "FT Service Log",
            "machine": machine,
            "service_date": service_date,
            "technician": technician,
            "service_hmr": flt(service_hmr),
            "service_type": flt(service_type),
            "notes": notes,
        }
    )

    sle.insert()

    return sle.name


@frappe.whitelist()
def breakdown_log_entry(
    resp,
    machine,
    description,
    category,
    breakdown_date,
    status,
    end_date=None,
    ted=None,
    parts_eta=None,
    out_eta=None,
    on_hold=None,
    ted_status=None,
    # NEW ↓
    urgent=None,
    quote_sent_date=None,
):
    ble = frappe.get_doc(
        {
            "doctype": "FT Breakdown Log",
            "machine": machine,
            "description": description,
            "category": category,
            "breakdown_date": breakdown_date,
            "end_date": end_date,
            "status": status,
            "ted": ted,
            "parts_eta": parts_eta,
            "out_eta": out_eta,
            "resp": resp,
            "on_hold": on_hold,
            "ted_status": ted_status,
            # NEW ↓
            "urgent": urgent,
            "quote_sent_date": quote_sent_date,
        }
    )

    ble.insert()
    return ble.name


@frappe.whitelist()
def defects_log_entry(
    machine,
    defect_type,
    category,
    description,
    start_date,
    priority,
    solution,
    end_date=None,
    parts_eta=None,
    ted=None,
    on_hold=None,
    ted_status=None,
):
    dle = frappe.get_doc(
        {
            "doctype": "FT Defects Log",
            "machine": machine,
            "defect_type": defect_type,
            "category": category,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "priority": priority,
            "parts_eta": parts_eta,
            "ted": ted,
            "solution": solution,
            "on_hold": on_hold,
            "ted_status": ted_status,
        }
    )

    dle.insert()

    return dle.name


@frappe.whitelist()
def update_library(
    sn,
    belt_dimensions=None,
    filters_list=None,
    equipment_information_form=None,
    hyd_filters_dimensions=None,
    nei_checklist=None,
    pdi_checklist=None,
    compatible_get=None,
    lube_types=None,
    wty_certificate=None,
    machine_picture=None,
    machine_data_plate=None,
    engine_data_plate=None,
    misc_files=None,
    rpc_list=None,
    parts_manuals=None,
    parts_manuals_2=None,
    parts_manuals_3=None,
):
    """
    :return:
    """

    machine = frappe.get_doc("FT Machine", sn)
    machine.update(
        {
            "belt_dimensions": belt_dimensions,
            "filters_list": filters_list,
            "equipment_information_form": equipment_information_form,
            "hyd_filters_dimensions": hyd_filters_dimensions,
            "nei_checklist": nei_checklist,
            "pdi_checklist": pdi_checklist,
            "compatible_get": compatible_get,
            "lube_types": lube_types,
            "wty_certificate": wty_certificate,
            "machine_picture": machine_picture,
            "machine_data_plate": machine_data_plate,
            "engine_data_plate": engine_data_plate,
            "misc_files": misc_files,
            "rpc_list": rpc_list,
            "parts_manuals": parts_manuals,
            "parts_manuals_2": parts_manuals_2,
            "parts_manuals_3": parts_manuals_3,
        }
    )
    machine.flags.ignore_mandatory = True
    machine.save(ignore_permissions=True, ignore_version=True)


@frappe.whitelist()
def upload_get_component_image(sn, component, image):
    frappe.get_doc(
        {
            "doctype": "FT Machine GET Component Image",
            "machine": sn,
            "image": image,
            "component": component,
        }
    ).insert()
