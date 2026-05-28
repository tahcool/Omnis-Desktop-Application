# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt

import frappe
from frappe.utils import getdate
from frappe.model.document import Document

from .. import MachineStateMixin

matplotlib.use("Agg")


class FTMonthlyReport(Document, MachineStateMixin):
    """

    eng. hrs (leave editable) - largest HMR in log(period) - smallest HMR in log(period)
    bg_hours (readonly)

    """

    def after_insert(self):
        self.setup_report()
        self.save()

    def setup_report(self):
        self.populate_customer_machines()
        self.populate_active_defects()

    def reset_report(self):
        self.machines = []
        self.active_defects = []

    def get_days_in_period(self):
        return (getdate(self.date_to) - getdate(self.date_from)).days + 1

    def populate_customer_machines(self):
        for machine in frappe.get_all(
            "FT Machine",
            filters={"customer": self.customer, "fleetrack_managed": "Yes"},
            fields=["name", "sn", "hours_remaining_to_service"],
        ):
            machine_state = self.__class__.get_state(machine.hours_remaining_to_service)

            self.append(
                "machines",
                {
                    "machine": machine.name,
                    "sn": machine.sn,
                    "state": machine_state,
                },
            )

    def set_summaries(self):
        for machine in self.machines:
            if not machine.shift_dur:
                shift_duration = 12
                machine.shift_dur = shift_duration * self.get_days_in_period()

            if not machine.engine_hrs:
                engine_hrs_queryset = frappe.db.get_all(
                    "FT HMR Log",
                    filters={
                        "machine": machine.machine,
                        "reading_date": ["between", [self.date_from, self.date_to]],
                    },
                    pluck="hmr",
                )
                if len(engine_hrs_queryset) > 1:
                    machine.engine_hrs = max(engine_hrs_queryset) - min(engine_hrs_queryset)
                elif len(engine_hrs_queryset) == 1:
                    machine.engine_hrs = engine_hrs_queryset[0]
                else:
                    machine.engine_hrs = 0

            bd_hours_sql = f"""SELECT SUM(bd_duration) FROM `tabFT Breakdown Log` WHERE machine = '{machine.machine}' AND breakdown_date BETWEEN '{self.date_from}' AND '{self.date_to}'"""
            bd_hours = frappe.db.sql(bd_hours_sql)
            bd_hours = bd_hours[0][0] if bd_hours[0][0] else 0

            assert (
                bd_hours <= machine.shift_dur
            ), "Breakdown hours cannot be more than shift hours in period"

            standby_hrs = machine.shift_dur - bd_hours - machine.engine_hrs

            assert (
                standby_hrs <= machine.shift_dur
            ), "Standby hours cannot be more than shift hours in period"

            machine.percentage_idling = (
                round((machine.idling_hrs / machine.engine_hrs) * 100, 2) if machine.engine_hrs else 0
            )
            machine.average_fuel_consumption = (
                machine.total_fuel_consumed / machine.engine_hrs
                if machine.total_fuel_consumed
                else 0
            )
            machine.bd_hrs = bd_hours
            machine.standby_hrs = standby_hrs
            machine.percentage_available = round(
                (((machine.engine_hrs + standby_hrs) - bd_hours) / ((machine.shift_dur))) * 100,
                2,
            )
            machine.percentage_utilisation = round(
                (machine.engine_hrs) / (((machine.shift_dur)) - bd_hours) * 100,
                2,
            )
            machine.percentage_idling = (
                round(machine.idling_hrs / machine.engine_hrs * 100, 2) if machine.engine_hrs else 0
            )

    @property
    def _between_filter(self):
        return ["between", [self.date_from, self.date_to]]

    def populate_active_defects(self):
        for defect in frappe.get_all(
            "FT Defects Log",
            filters={
                "customer": self.customer,
                "end_date": ["is", "not set"],
                "start_date": ["between", [self.date_from, self.date_to]],
            },
            fields=["name", "description", "description_new", "machine"],
        ):
            self.append(
                "active_defects",
                {
                    "defect_reference": defect.name,
                    "description": defect.description or defect.description_new,
                    "machine": defect.machine,
                },
            )

    def create_utilization_plot(self):
        machine_data = [
            {
                "machine": f"{machine.model}\n{machine.type}\n{machine.machine}",
                "availability": machine.percentage_available,
                "utilization": machine.percentage_utilisation,
                "idling": machine.percentage_idling,
            }
            for machine in self.machines
        ]

        utilization_graph_filename = (
            f"{self.name}-utilization-graph-{frappe.generate_hash('', 5)}.png"
        )
        utilization_graph_full_path = (
            frappe.get_site_path() + f"/public/files/{utilization_graph_filename}"
        )

        df = pd.DataFrame(machine_data)
        colors = ["#4c4848", "#d70001", "#f9ff05"]
        ax = df.plot(x="machine", kind="bar", figsize=(24, 4), color=colors)
        ax.set_xticklabels(
            ax.get_xticklabels(),
            rotation=0,
            ha="center",
            fontweight="bold",
            fontsize=16,
        )
        for p in ax.containers:
            ax.bar_label(
                p,
                label_type="edge",
                fontsize=14,
                fmt="%d",
            )
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_visible(False)
        ax.spines["left"].set_visible(False)

        plt.subplots_adjust(top=1, bottom=0, right=1, left=0, hspace=0, wspace=0)

        ax.get_figure().savefig(
            utilization_graph_full_path,
            bbox_inches="tight",
            pad_inches=0,
            format="png",
        )

        file_obj = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": utilization_graph_filename,
                "file_url": f"/files/{utilization_graph_filename}",
                "attached_to_doctype": "FT Monthly Report",
                "attached_to_name": self.name,
            }
        )
        file_obj.insert(ignore_permissions=True)
        frappe.db.set_value(
            "FT Monthly Report", self.name, "utilization_graph", file_obj.file_url
        )


@frappe.whitelist()
def reset_ft_monthly_report(report_name: str):
    report: FTMonthlyReport = frappe.get_doc("FT Monthly Report", report_name)
    report.reset_report()
    report.save()
    report.reload()
    report.setup_report()
    report.save()
    return report


@frappe.whitelist()
def run_ft_monthly_report_calc(report_name: str):
    report: FTMonthlyReport = frappe.get_doc("FT Monthly Report", report_name)
    report.set_summaries()
    report.save()
    return report


@frappe.whitelist()
def regenerate_utilization_graph(report_name: str):
    report = frappe.get_doc("FT Monthly Report", report_name)
    report.create_utilization_plot()
    return report
