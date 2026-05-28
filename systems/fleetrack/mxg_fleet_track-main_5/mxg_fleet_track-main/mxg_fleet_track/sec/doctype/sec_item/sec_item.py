# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SECItem(Document):
    pass


@frappe.whitelist()
def repair_log_entry(
        sec_item_no,
        description,
        date_logged,
        status,
        end_date=None,
        ted=None,
        parts_eta=None,
        out_eta=None,
        on_hold=None,
        ted_status=None,
        technician_assigned=None,
        job_number=None,
):
    sec_rle = frappe.get_doc({
        "doctype": "SEC Repair Log Entry",
        "sec_item_no": sec_item_no,
        "description": description,
        "date_logged": date_logged,
        "end_date": end_date,
        "status": status,
        "ted": ted,
        "parts_eta": parts_eta,
        "outwork_eta": out_eta,
        'on_hold': on_hold,
        'ted_status': ted_status,
        'technician_assigned': technician_assigned,
        'job_number': job_number,
    })

    sec_rle.insert()

    return sec_rle.name
