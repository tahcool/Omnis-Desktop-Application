# Copyright (c) 2023, Percival Rapha and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class FTMachineConditionAssessment(Document):
	pass


@frappe.whitelist()
def upload_image(image, caption, mca):
	gallery_entry = frappe.get_doc({
		"doctype": "FT Image Gallery",
		"image": image,
		"caption": caption,
		"reference_doctype": "FT Machine Condition Assessment",
		"reference_name": mca
	})
	gallery_entry.insert()
	return gallery_entry.name