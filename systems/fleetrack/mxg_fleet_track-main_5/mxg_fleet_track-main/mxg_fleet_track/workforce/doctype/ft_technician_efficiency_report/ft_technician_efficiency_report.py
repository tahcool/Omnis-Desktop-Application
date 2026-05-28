# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd
import frappe
from frappe.model.document import Document


class FTTechnicianEfficiencyReport(Document):
    def get_logs_for_period(self):
        hour_logs_in_range = frappe.get_all(
            "FT Technician Hour Log",
            filters={"date": ["between", [self.date_from, self.date_to]]},
            fields=[
                "technician",
                "productive",
                "travel",
                "admin",
                "house_keeping",
                "non_productive",
            ],
        )
        df = pd.DataFrame.from_records(hour_logs_in_range)
        if not df.empty:
            df = df.groupby(["technician"]).sum().reset_index()
            df["total_billable"] = df["productive"] + df["travel"]
            df["total_non_billable"] = (
                df["admin"] + df["house_keeping"] + df["non_productive"]
            )

            # efficiency = total_billed / total_billable (0 if any is 0) to cater for division by zero
            efficiency_calculator = (
                lambda billed, billable: (billed / billable) * 100 if billable else 0
            )
            df["efficiency"] = df.apply(
                lambda row: efficiency_calculator(
                    row["total_billable"], row["total_non_billable"]
                ),
                axis=1,
            )

            return df.values.tolist()
        return []


@frappe.whitelist()
def get_efficiency_report_items(name):
    report = frappe.get_doc("FT Technician Efficiency Report", name)
    return report.get_logs_for_period()
