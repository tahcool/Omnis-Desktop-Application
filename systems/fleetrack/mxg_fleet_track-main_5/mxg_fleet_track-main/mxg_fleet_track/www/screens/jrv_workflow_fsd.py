import pandas as pd

import frappe
from frappe.utils import rounded

from mxg_fleet_track.www.screens import authenticate_aux
from mxg_fleet_track.mxg_fleet_track.report.field_service_planner.field_service_planner import (
    get_data_frame,
)

no_cache = 1


def get_context(context):
    if authenticate_aux(frappe.form_dict.get("aux_pin", "")):
        context.aux_auth = 1

    context.today = frappe.utils.today()
    context.aux_pin = frappe.form_dict.get("aux_pin", "")

    planner_df = get_data_frame()

    # to list of dicts
    planner_data = planner_df.to_dict("records")

    context.planner = planner_data
    context.efficiency = 0

    return context
