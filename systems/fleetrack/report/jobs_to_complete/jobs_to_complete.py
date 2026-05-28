# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt
import pandas as pd
import frappe
from mxg_fleet_track.utils import get_users_with_role


WORKFLOW_TO_COMPLETE_STAGE = "To Complete"
WORKFLOW_JRV_STAGE = "JRV Stage"
WORKFLOW_QUOTATION_STAGE = "Quotation Stage"
WORKFLOW_QUOTATION_PARTS_STAGE = "Quotation or Parts Stage"
WORKFLOW_QUOTATION_TO_BE_SENT_STAGE = "Quotation to be sent to VC"
WORKFLOW_QUOTATION_FOLLOW_UP_STAGE = "QFU"
WORKFLOW_QUOTATION_LOST_STAGE = "Lost"
WORKFLOW_SERVICE_PLAN_STAGE = "Service Plan"
WORKFLOW_STATE_COMPLETED = "Complete"
WORKFLOW_STATE_FIELD_NAME = "workflow_state"
ALL_WORKFLOW_STATES = [
    WORKFLOW_JRV_STAGE,
    WORKFLOW_QUOTATION_STAGE,
    WORKFLOW_QUOTATION_PARTS_STAGE,
    WORKFLOW_QUOTATION_TO_BE_SENT_STAGE,
    WORKFLOW_QUOTATION_FOLLOW_UP_STAGE,
    WORKFLOW_SERVICE_PLAN_STAGE,
    WORKFLOW_TO_COMPLETE_STAGE,
    WORKFLOW_STATE_COMPLETED,
]

STAGE_PLUS_ROLE_MAPPING = {
    WORKFLOW_JRV_STAGE: "MXG-JRV-MGR",
    WORKFLOW_QUOTATION_STAGE: "MXG-QUOTE-MGR",
    WORKFLOW_QUOTATION_PARTS_STAGE: "MXG-QUOTE-PARTS-MGR",
    WORKFLOW_QUOTATION_TO_BE_SENT_STAGE: "MXG-QUOTE-MGR",
    WORKFLOW_QUOTATION_FOLLOW_UP_STAGE: "MXG-QFU-TEAM",
    WORKFLOW_SERVICE_PLAN_STAGE: "MXG-QUOTE-MGR",
    WORKFLOW_TO_COMPLETE_STAGE: "MXG-CONTROLLER",
}


def get_data_frame():
    data = frappe.db.sql(
        f"""
	SELECT jrv.name,
		jrv.job_no,
		jrv.customer,
		jrv.customer_ref,
		jrv.fleet_no,
		jrv.machine,
		jrv.machine_model,
		jrv.machine_type,
		jrv.location,
		jrv.days_on_current_stage,
        jrv.workflow_state,
		jrv.days_running,
        jrv.responsibility,
		GROUP_CONCAT(dets.basic_description SEPARATOR ', ') AS Description
	FROM `tabFT JRV` jrv
	JOIN `tabFT JRV Details` dets ON jrv.name = dets.parent  
	WHERE 
        workflow_state = "{WORKFLOW_TO_COMPLETE_STAGE}"
	GROUP BY jrv.name, dets.parent
	""",
        as_dict=True,
    )
    df = pd.DataFrame.from_records(data)

    if not df.empty:

        def get_responsible_person(row):
            if row[WORKFLOW_STATE_FIELD_NAME] in STAGE_PLUS_ROLE_MAPPING.keys():
                role = STAGE_PLUS_ROLE_MAPPING[row[WORKFLOW_STATE_FIELD_NAME]]
                users = get_users_with_role(role)
                if any(users):
                    return ", ".join(
                        [u.full_name for u in users if u.name != "Administrator"]
                    )
            return ""

        df["responsible_parties"] = df.apply(get_responsible_person, axis=1)
    return df


def get_data(df, filters=None):
    data = df.values.tolist()
    return data


def get_columns(df, filters=None):
    cols = [
        {
            "fieldname": col,
            "fieldtype": "Data",
            "label": str(col).title(),
            "width": 120,
        }
        for col in df.columns
    ]
    return cols


def execute(filters=None):
    df = get_data_frame()
    return get_columns(df, filters), get_data(df, filters)
