import datetime

import pandas as pd
import numpy as np

import random

import frappe
from frappe.utils import getdate


class FtUpload(object):
    _file_path: str

    def __init__(self, fp):
        self._file_path = fp

    @staticmethod
    def _create_customers(df: pd.DataFrame, column):
        for customer_name in df[column].unique():
            if customer_name and not frappe.db.exists("FT Customer", {"customer_name": str(customer_name).strip()}):
                frappe.get_doc({
                    "doctype": "FT Customer",
                    "customer_name": str(customer_name).strip()
                }).insert(ignore_permissions=True, )

    @staticmethod
    def _create_machine_oems(df: pd.DataFrame, column):
        for oem in df[column].unique():
            if oem and not frappe.db.exists("FT Machine OEM", {"oem": str(oem).strip()}):
                frappe.get_doc({
                    "doctype": "FT Machine OEM",
                    "oem": str(oem).strip()
                }).insert(ignore_permissions=True, )

    @staticmethod
    def _create_machine_types(df: pd.DataFrame, column):
        for machine_type in df[column].unique():
            if machine_type and not frappe.db.exists("FT Machine Type", {"type_name": str(machine_type).strip()}):
                frappe.get_doc({
                    "doctype": "FT Machine Type",
                    "type_name": str(machine_type).strip()
                }).insert(ignore_permissions=True, )

    @staticmethod
    def _create_locations(df: pd.DataFrame, column):
        for loc in df[column].unique():
            if loc and not frappe.db.exists("FT Location", {"location": str(loc).strip()}):
                frappe.get_doc({
                    "doctype": "FT Location",
                    "location": str(loc).strip()
                }).insert(ignore_permissions=True, ignore_mandatory=True)

    @staticmethod
    def _create_model(model: str, oem: str, si: float = 0.0):
        if all([model, oem]):
            if not frappe.db.exists("FT Machine Model", {"oem": str(oem).strip(), "model_name": str(model).strip()}):
                frappe.get_doc({
                    "doctype": "FT Machine Model",
                    "oem": str(oem).strip(),
                    "model_name": str(model).strip(),
                    "si_hours": si,
                }).insert(ignore_permissions=True, ignore_mandatory=True)
            else:
                if si:
                    frappe.db.set_value("FT Machine Model", f"{str(oem).strip()}-{str(model).strip()}", "si_hours", si)

            return f"{str(oem).strip()}-{str(model).strip()}"

    @staticmethod
    def _create_regions(df: pd.DataFrame, column):
        for region in df[column].unique():
            if region and not frappe.db.exists("FT Region", {"region_name": str(region).strip()}):
                frappe.get_doc({
                    "doctype": "FT Region",
                    "region_name": str(region).strip()
                }).insert(ignore_permissions=True, )

    def _run(self):
        epr: pd.DataFrame = pd.read_excel(self._file_path, sheet_name="EPR ")

        epr.dropna(subset=["SRN"], how="all", inplace=True)
        epr.dropna(subset=["MAKE"], how="all", inplace=True)
        epr.dropna(subset=["MODEL"], how="all", inplace=True)
        epr.dropna(subset=["TYPE"], how="all", inplace=True)
        epr.dropna(subset=["CUSTOMER"], how="all", inplace=True)

        # Start With Links
        self._create_customers(epr, "CUSTOMER")
        self._create_machine_types(epr, "TYPE")
        self._create_machine_oems(epr, "MAKE")
        self._create_locations(epr, "LOCATION")
        self._create_regions(epr, "REGION")

        # 1. Format columns, Skip Without SRN & Duplicates

        epr_cat_cols = ["CUSTOMER",
                        "LOCATION",
                        "REGION",
                        "TYPE",
                        "MAKE",
                        "MODEL",
                        "SRN",
                        "Engine Type",
                        "ESN",
                        "MXG Supplied?",
                        "Warranty Type",
                        "Service Obligation",
                        "Fleetrack?",
                        "OEM Telematics",
                        "CHASSIS NUMBER",
                        ]

        epr[epr_cat_cols] = epr[epr_cat_cols].astype('string')
        epr[epr_cat_cols] = epr[epr_cat_cols].applymap(str.strip, na_action="ignore")
        epr["Warranty Hours"] = pd.to_numeric(epr["Warranty Hours"], errors="coerce")
        epr["WTY EXP. DATE"] = pd.to_datetime(epr["WTY EXP. DATE"], errors="coerce")
        epr["Handover"] = pd.to_datetime(epr["Handover"], errors="coerce")
        epr["Warranty Period (Months)"] = pd.to_numeric(epr["Warranty Period (Months)"], errors="coerce")

        epr = epr.drop_duplicates('SRN', keep='first')
        epr = epr.replace({np.nan: None})

        epr["Warranty Type"] = epr["Warranty Type"].apply(lambda x: x.title() if x else "Not Specified")
        epr["MXG Supplied?"] = epr["MXG Supplied?"].apply(lambda x: x if x == "Yes" else "Not Specified")
        epr["Service Obligation"] = epr["Service Obligation"].apply(
            lambda x: x if x in ["Customer", "MXG"] else "Not Specified"
        )
        self._insert_epr(epr)

    def _run_ft(self):
        print(f"<<Fleetrack Import>> Begin!")
        ft: pd.DataFrame = pd.read_excel(self._file_path, sheet_name="Fleetrack")
        ft.dropna(subset=["SN"], how="all", inplace=True)
        ft[["SN", "Customer"]] = ft[["SN", "Customer"]].astype("string")
        ft[["SN", "Customer"]] = ft[["SN", "Customer"]].applymap(str.strip)
        ft[["SN"]] = ft[["SN"]].applymap(str.upper)

        ft.dropna(subset=["Make"], how="all", inplace=True)
        ft.dropna(subset=["Model"], how="all", inplace=True)
        ft.dropna(subset=["Machine"], how="all", inplace=True)
        ft.dropna(subset=["Customer"], how="all", inplace=True)

        print(f"<<Fleetrack Import>> Dataset Cleanup complete!")

        def transform_tba(x):
            if x.upper() == "TBA":
                return f"{x}-{frappe.generate_hash('', 7)}"
            return x

        ft["SN"] = ft["SN"].apply(transform_tba)

        str_cols = ["Fleet No", "Machine", "Make", "Model", "Location", "WARRANTY STATUS", "Service Obligation",
                    "Region", "NOTES"]
        ft[str_cols] = ft[str_cols].astype('string')
        ft[str_cols] = ft[str_cols].applymap(str.strip, na_action='ignore')

        ft["CURRENT HOURS"] = pd.to_numeric(ft["CURRENT HOURS"], errors="coerce")
        ft["SERVICE INTERVALS"] = pd.to_numeric(ft["SERVICE INTERVALS"], errors="coerce")
        ft["NEXT SERVICE HOURS"] = pd.to_numeric(ft["NEXT SERVICE HOURS"], errors="coerce")
        ft["LAST SERVICE HRS"] = pd.to_numeric(ft["LAST SERVICE HRS"], errors="coerce")
        ft["HOURS TO SERVICE"] = pd.to_numeric(ft["HOURS TO SERVICE"], errors="coerce")

        def fix_warranty(x):
            if not pd.isna(x):
                if x.lower() in ["under warranty", "out of warranty"]:
                    if x.lower() == "under warranty":
                        return "Under Warranty"
                    else:
                        return "Out of Warranty"
            return "N/A"

        ft["WARRANTY STATUS"] = ft["WARRANTY STATUS"].apply(fix_warranty)
        ft = ft.replace({np.nan: None})

        # Start With Links
        self._create_customers(ft, "Customer")
        self._create_machine_types(ft, "Machine")
        self._create_machine_oems(ft, "Make")
        self._create_locations(ft, "Location")
        self._create_regions(ft, "Region")

        self._insert_ft(ft)

    def run(self):
        self._run()
        self._run_ft()

    def _insert_ft(self, ft: pd.DataFrame):
        for index, row in ft.iterrows():
            model = self._create_model(row["Model"], row["Make"], si=row["SERVICE INTERVALS"])

            last_service_date = ""
            track_initial_service = "No"

            if row["LAST SERVICE DATE"] and str(row["LAST SERVICE DATE"]).lower() == "new":
                track_initial_service = "Yes"
            else:
                try:
                    last_service_date = getdate(row["LAST SERVICE DATE"])
                except Exception as ex:
                    ...

            if not frappe.db.exists("FT Machine", {"sn": row["SN"]}):
                frappe.get_doc({
                    "doctype": "FT Machine",
                    "fleetrack_managed": "Yes",
                    "supplied": "Not Specified",
                    "customer": row["Customer"],
                    "sn": row["SN"],
                    "model": model,
                    "oem": row["Make"],
                    "type": row["Machine"],
                    "fleet_no": row["Fleet No"],
                    "location": row["Location"],
                    "region": row["Region"],

                    "track_initial_service": track_initial_service,

                    "service_obligation": row["Service Obligation"],
                    "service_interval_hours": row["SERVICE INTERVALS"] if row["SERVICE INTERVALS"] else 0.0,
                    "starting_hmr": row["CURRENT HOURS"] if row["CURRENT HOURS"] else 0.0,
                    "current_hmr": row["CURRENT HOURS"] if row["CURRENT HOURS"] else 0.0,
                    "hours_remaining_to_service": row["HOURS TO SERVICE"] if row["HOURS TO SERVICE"] else 0.0,
                    "last_service_hmr": row["LAST SERVICE HRS"] if row["LAST SERVICE HRS"] else 0.0,
                    "next_service_hmr": row["NEXT SERVICE HOURS"] if row["NEXT SERVICE HOURS"] else 0.0,

                    "last_service_date": last_service_date,

                    "warranty_status": row["WARRANTY STATUS"],

                    "notes": str(row["NOTES"]).strip() if row["NOTES"] else "",
                }).insert(ignore_mandatory=True, ignore_links=True, )
            else:
                machine = frappe.get_doc("FT Machine", row["SN"])
                machine.fleetrack_managed = "Yes"
                machine.supplied = "Not Specified"
                machine.customer = row["Customer"]
                machine.model = model
                machine.oem = row["Make"]
                machine.type = row["Machine"]
                machine.fleet_no = row["Fleet No"]
                machine.location = row["Location"]
                machine.region = row["Region"]

                machine.track_initial_service = track_initial_service

                machine.service_obligation = row["Service Obligation"]
                machine.service_interval_hours = row["SERVICE INTERVALS"] if row["SERVICE INTERVALS"] else 0.0
                machine.starting_hmr = row["CURRENT HOURS"] if row["CURRENT HOURS"] else 0.0
                machine.current_hmr = row["CURRENT HOURS"] if row["CURRENT HOURS"] else 0.0
                machine.hours_remaining_to_service = row["HOURS TO SERVICE"] if row["HOURS TO SERVICE"] else 0.0
                machine.last_service_hmr = row["LAST SERVICE HRS"] if row["LAST SERVICE HRS"] else 0.0
                machine.next_service_hmr = row["NEXT SERVICE HOURS"] if row["NEXT SERVICE HOURS"] else 0.0

                machine.last_service_date = last_service_date

                machine.warranty_status = row["WARRANTY STATUS"]

                machine.notes = str(row["NOTES"]).strip() if row["NOTES"] else ""
                machine.save(
                    ignore_permissions=True,  # ignore write permissions during insert
                    ignore_version=True  # do not create a version record
                )

    def _insert_epr(self, epr: pd.DataFrame):

        for index, row in epr.iterrows():
            model = self._create_model(row["MODEL"], row["MAKE"])
            try:
                frappe.get_doc({
                    "doctype": "FT Machine",
                    "fleetrack_managed": row["Fleetrack?"],
                    "supplied": row["MXG Supplied?"],
                    "customer": row["CUSTOMER"],
                    "sn": row["SRN"],
                    "model": model,
                    "oem": row["MAKE"],
                    "gearbox": row["GEAR BOX"],
                    "type": row["TYPE"],
                    "fleet_no": row["FLT No."],
                    "esn": row["ESN"],
                    "location": row["LOCATION"] if row["LOCATION"] else "",
                    "region": row["REGION"] if row["REGION"] else "",
                    "chassis_number": row["CHASSIS NUMBER"],
                    "engine_type": row["Engine Type"],
                    "service_obligation": row["Service Obligation"],

                    "warranty_type": row["Warranty Type"],
                    "warranty_hours": row["Warranty Hours"],
                    "warranty_period": row["Warranty Period (Months)"],
                    "handover_date": row["Handover"].date() if row["Handover"] else "",
                    "expiry_date": row["WTY EXP. DATE"].date() if row["WTY EXP. DATE"] else "",

                    "notes": str(row["NOTES"]).strip() if row["NOTES"] else "",
                }).insert(ignore_mandatory=True, ignore_links=True, )
            except:
                continue
