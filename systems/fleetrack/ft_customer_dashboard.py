# -*- coding: utf-8 -*-
"""
Fleetrack → Omnis – Customer Management endpoints
Doctype: FT Customer
"""
from __future__ import annotations
import frappe


@frappe.whitelist(allow_guest=True)
def get_ft_customers():
    """Return all FT Customers with machine counts."""
    try:
        customers = frappe.db.get_all(
            "FT Customer",
            fields=["name", "customer_name", "contact_person", "phone", "email",
                    "region", "whatsapp_group_id"],
            order_by="customer_name asc",
            limit_page_length=500,
            ignore_permissions=True,
        )

        for c in customers:
            try:
                c["machine_count"] = frappe.db.count(
                    "FT Machine", filters={"customer": c["name"]}
                )
            except Exception:
                c["machine_count"] = 0

        return {"customers": customers}

    except Exception as e:
        frappe.log_error(f"get_ft_customers error: {e}")
        return {"customers": [], "error": str(e)}


@frappe.whitelist(allow_guest=True)
def create_ft_customer(customer_name, contact_person=None, phone=None,
                       email=None, region=None, whatsapp_group_id=None):
    """Create a new FT Customer record."""
    if not customer_name:
        return {"error": "Customer name is required"}
    try:
        doc = frappe.new_doc("FT Customer")
        doc.customer_name = customer_name
        if contact_person: doc.contact_person = contact_person
        if phone:          doc.phone = phone
        if email:
            try: doc.email = email
            except Exception: pass
        if region:
            try: doc.region = region
            except Exception: pass
        if whatsapp_group_id and hasattr(doc, "whatsapp_group_id"):
            doc.whatsapp_group_id = whatsapp_group_id

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return {"ok": True, "name": doc.name}

    except Exception as e:
        frappe.log_error(f"create_ft_customer error: {e}")
        return {"error": str(e)}


@frappe.whitelist(allow_guest=True)
def update_ft_customer(name, customer_name=None, contact_person=None, phone=None,
                       email=None, region=None, whatsapp_group_id=None):
    """Update an existing FT Customer record."""
    if not name:
        return {"error": "Customer name/ID is required"}
    try:
        doc = frappe.get_doc("FT Customer", name)
        if customer_name:              doc.customer_name = customer_name
        if contact_person is not None: doc.contact_person = contact_person
        if phone is not None:          doc.phone = phone
        if email is not None:
            try: doc.email = email
            except Exception: pass
        if region is not None:
            try: doc.region = region
            except Exception: pass
        if whatsapp_group_id is not None and hasattr(doc, "whatsapp_group_id"):
            doc.whatsapp_group_id = whatsapp_group_id

        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {"ok": True, "name": doc.name}

    except Exception as e:
        frappe.log_error(f"update_ft_customer error: {e}")
        return {"error": str(e)}
