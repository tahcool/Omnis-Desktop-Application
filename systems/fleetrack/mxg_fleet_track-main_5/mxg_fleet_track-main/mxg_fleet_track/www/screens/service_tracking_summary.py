import frappe
from frappe.utils import format_date
from frappe.utils.password import get_decrypted_password

from . import authenticate_aux
from ...mxg_fleet_track.report import get_sts_summary

no_cache = 1


def get_context(context):
    if authenticate_aux(frappe.form_dict.get("aux_pin", "")):
        context.aux_auth = 1
    else:
        context.aux_auth = 0

    context.today = frappe.utils.today()
    context.aux_pin = frappe.form_dict.get("aux_pin", "")

    data = frappe.db.get_all('FT Machine', filters={
        "fleetrack_managed": "Yes",
    }, fields=[
        "customer",
        "sn",
        "model",
        "mxg_fleet_no",
        "fleet_no",
        "type",
        "location",
        "current_hmr",
        "warranty_status",
        "hours_remaining_to_service",
        "last_service_hmr",
        "last_service_type",
        "last_service_date",
        "next_service_hmr",
        "next_service_type",
    ], order_by="hours_remaining_to_service asc")
    context.summary = data
    context.groups = get_sts_summary(data, columns=[], lod=True)
    return context
