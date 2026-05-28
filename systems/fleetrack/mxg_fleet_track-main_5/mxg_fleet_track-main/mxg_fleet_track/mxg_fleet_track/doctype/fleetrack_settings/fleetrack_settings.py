# Copyright (c) 2022, Percival Rapha and contributors
# For license information, please see license.txt

import pandas as pd

import frappe
from frappe.model.document import Document
from frappe.utils import get_table_name

from . import FtUpload


class FleetrackSettings(Document):
    pass


def run_upload(file):
    FtUpload(file).run()


# noinspection PyUnresolvedReferences
@frappe.whitelist()
def upload_data(master_file):
    file_path = frappe.get_doc("File", master_file).get_full_path()
    # run_upload(file_path)
    frappe.enqueue(run_upload, queue='short', file=file_path)


@frappe.whitelist()
def wipe_data():
    """
    :return:
    """

    for dt in frappe.get_all("DocType", {"module": "MXG Fleet Track", "issingle": 0}, pluck="name"):
        frappe.db.sql(f"TRUNCATE `{get_table_name(dt)}`")
