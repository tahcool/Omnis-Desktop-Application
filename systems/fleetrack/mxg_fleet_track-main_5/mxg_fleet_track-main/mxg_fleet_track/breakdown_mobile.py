# mxg_fleet_track/mxg_fleet_track/breakdown_mobile.py
from __future__ import annotations
import frappe

from .breakdown_whatsapp import send_breakdown_whatsapp_update  # you already have this


@frappe.whitelist()
def approve_breakdown(name: str, level: str, decision: str = "approve", comment: str | None = None):
    """
    Mobile approval endpoint for FT Breakdown Log.

    level:
      - "supervisor"
      - "manager"

    decision:
      - "approve"
      - "decline"

    Behaviour:

    SUPERVISOR:
      approve -> sets supervisor_approved = 1, stamps by/on, optional comment
      decline -> supervisor_approved = 0, logs decline comment

    MANAGER:
      approve -> requires supervisor_approved, sets manager_approved = 1, stamps by/on, sends WhatsApp
      decline -> just logs decline comment (no WhatsApp)
    """
    level = (level or "").lower().strip()
    decision = (decision or "approve").lower().strip()

    if level not in ("supervisor", "manager"):
        frappe.throw("Invalid approval level")

    if decision not in ("approve", "decline"):
        frappe.throw("Invalid decision; must be 'approve' or 'decline'.")

    doc = frappe.get_doc("FT Breakdown Log", name)

    user = frappe.session.user
    roles = set(frappe.get_roles(user))

    # SUPERVISOR FLOW
    if level == "supervisor":
        if "Fleet Supervisor" not in roles and "System Manager" not in roles:
            frappe.throw("You are not allowed to approve as Supervisor.")

        if decision == "approve":
            doc.supervisor_approved = 1
            if hasattr(doc, "supervisor_approved_by"):
                doc.supervisor_approved_by = user
            if hasattr(doc, "supervisor_approved_on"):
                doc.supervisor_approved_on = frappe.utils.now_datetime()
        else:
            # decline → ensure flag is off
            doc.supervisor_approved = 0

        if comment:
            doc.add_comment(
                "Comment",
                f"Supervisor {decision}d from mobile ({user}): {comment}"
            )

    # MANAGER FLOW
    elif level == "manager":
        if "Fleet Manager" not in roles and "System Manager" not in roles:
            frappe.throw("You are not allowed to approve as Manager.")

        if not getattr(doc, "supervisor_approved", None):
            frappe.throw("Supervisor approval is required before Manager approval.")

        if decision == "approve":
            doc.manager_approved = 1
            if hasattr(doc, "manager_approved_by"):
                doc.manager_approved_by = user
            if hasattr(doc, "manager_approved_on"):
                doc.manager_approved_on = frappe.utils.now_datetime()

            # Trigger your existing WhatsApp send
            send_breakdown_whatsapp_update(doc.name)
        else:
            if comment:
                doc.add_comment(
                    "Comment",
                    f"Manager declined from mobile ({user}): {comment}"
                )

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"ok": True, "name": doc.name, "level": level, "decision": decision}
