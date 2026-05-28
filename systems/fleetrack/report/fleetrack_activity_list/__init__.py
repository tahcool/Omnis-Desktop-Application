import frappe
import pandas as pd


# noinspection SqlDialectInspection
class Activity(object):
    """
    Columns:
        - Date
        - Type (Quote Alert, Quote Follow Up, Maintenance Warning, Stop Machine, Breakdown, Defect)
        - Description
        - Status
        - Machine SN
        - Machine Model
        - Customer
        -
    """

    dataset: list = []

    def __init__(self):
        self.dataset = []

    def process(self):
        self._process_alerts()
        self._process_breakdowns()
        self._process_defects()

    def _process_alerts(self):
        sql = """
            SELECT
            date_issued as "Date",
            alert_type as "Type",
            CASE WHEN alert_type = 'Quote Alert' THEN CONCAT("Quote <b>", Customer, "</b> for Service")
            WHEN alert_type = 'Quote Follow Up' THEN CONCAT("Make follow up on Quotation")
            WHEN alert_type = 'Maintenance Warning' THEN CONCAT("Maintenance Warning for ", model, "(", machine, ")")
            WHEN alert_type = 'Stop Machine' THEN CONCAT("Stop and Fix ", model, "(", machine, ")")
            WHEN alert_type = 'HMR Alert' THEN CONCAT(days_since_last_hmr, " days since last HMR update")
            ELSE REPLACE(a.desc, '-', " ")
            END AS Description,
            status as Status,
            machine as "SRN",
            model as "Model",
            customer as "Customer"
            FROM `tabFT Alert` a
            WHERE status = 'Pending' and fleetrack_managed="Yes"
        """

        self.dataset += frappe.db.sql(sql, as_list=1)

    def _process_breakdowns(self):
        sql = """
            SELECT
            breakdown_date as "Date",
            "Breakdown" as "Type",
            description as Description,
            status as Status,
            machine as "SRN",
            model as "Model",
            customer as "Customer"
            FROM `tabFT Breakdown Log`
            WHERE end_date IS NULL and fleetrack_managed="Yes"
        """

        self.dataset += frappe.db.sql(sql, as_list=1)

    def _process_defects(self):
        sql = """
            SELECT
            start_date as "Date",
            CONCAT(defect_type, " Defect") as "Type",
            description as Description,
            solution as Status,
            machine as "SRN",
            model as "Model",
            customer as "Customer"
            FROM `tabFT Defects Log`
            WHERE end_date IS NULL and fleetrack_managed="Yes"
        """

        self.dataset += frappe.db.sql(sql, as_list=1)

    def get_data(self):
        df = pd.DataFrame(self.dataset, columns=[
            "Date",
            "Type",
            "Description",
            "Status",
            "SRN",
            "Model",
            "Customer",
        ])
        df[
            ["Type", "Model", "Customer"]
        ] = df[
            ["Type", "Model", "Customer"]
        ].astype('category')

        return df
