# -*- coding: utf-8 -*-
"""
Webhook endpoint for Whapi Cloud – FT Breakdown Log approvals + edits + customer send.

Behaviour:

- APPROVE (from the main card):
    • Mark breakdown as supervisor-approved.
    • Build customer uDBR message:
        - Machine = FT Machine.model (e.g. "SG21-B6 DS")
        - Fleet no = FT Machine.fleet_no (Customer Ref), fallback to doc.fleet_no.
    • Send immediately to the customer's WhatsApp group (CSG) using Whapi.
    • Send a confirmation back to the supervisor (with progress info).

- EDIT:
    • Field-based edit (Description, Status, TED, Parts ETA, Outwork ETA) via list + text.
"""

from __future__ import annotations
import json
import requests
import frappe
from frappe.utils import now_datetime, getdate

from .breakdown_whatsapp_approval import (
    WHAPI_BASE,
    _whapi_headers,
    _update_doc_status,
)

# -------------------------------------------------------------------
# Sending helpers
# -------------------------------------------------------------------


def _send_text(to: str, body: str) -> None:
    """Basic Whapi text send helper (same pattern as supervisor code)."""
    payload = {"to": to, "body": body}
    resp = requests.post(
        f"{WHAPI_BASE}/messages/text",
        headers=_whapi_headers(),
        data=json.dumps(payload),
        timeout=15,
    )
    if not resp.ok:
        frappe.log_error(
            f"Payload:\n{json.dumps(payload, indent=2)}\n\nResponse:\n{resp.text}",
            "Whapi Text Send Failed",
        )


def _send_list(
    to: str,
    header: str,
    body: str,
    footer: str,
    sections: list,
    label: str,
) -> None:
    """Interactive list helper (used for EDIT field picker)."""
    payload = {
        "header": {"text": header},
        "body": {"text": body},
        "footer": {"text": footer},
        "action": {"list": {"sections": sections, "label": label}},
        "type": "list",
        "to": to,
    }
    resp = requests.post(
        f"{WHAPI_BASE}/messages/interactive",
        headers=_whapi_headers(),
        data=json.dumps(payload),
        timeout=15,
    )
    if not resp.ok:
        frappe.log_error(json.dumps(payload, indent=2), "Whapi List Send Failed")


# -------------------------------------------------------------------
# Customer message builder
# -------------------------------------------------------------------


def _format_customer_update(doc, include_footer=True):
    """
    Build the customer-facing uDBR message.

    - Machine: use FT Machine.model (Link FT Machine Model) so they see e.g. "SG21-B6 DS"
      instead of the FT Machine name (which is usually chassis number).
    - Fleet no: use FT Machine.fleet_no (Customer Ref); fallback to doc.fleet_no; then "TBA".
    """

    machine_label = "TBA"
    fleet_no = "TBA"

    # Try to pull from linked FT Machine
    if getattr(doc, "machine", None):
        try:
            m = frappe.db.get_value(
                "FT Machine",
                doc.machine,
                ["model", "fleet_no"],
                as_dict=True,
            )
        except Exception:
            m = None

        if m:
            # model is a Link to FT Machine Model, value is readable code e.g. "SG21-B6 DS"
            if m.get("model"):
                machine_label = m.get("model")
            # Customer Ref on FT Machine (Data fleet_no)
            if m.get("fleet_no"):
                fleet_no = m.get("fleet_no")

    # Fallbacks
    if machine_label == "TBA" and getattr(doc, "machine", None):
        machine_label = doc.machine

    if fleet_no == "TBA":
        fleet_no = getattr(doc, "fleet_no", None) or "TBA"

    location = doc.location or "TBA"
    bd_date = doc.breakdown_date or "TBA"
    duration = getattr(doc, "days_on_bd", None) or doc.bd_duration or "TBA"
    description = doc.description or "No description"
    status = doc.status or "TBA"
    ted_status = doc.ted_status or "TBA"
    parts_eta = doc.parts_eta or "TBA"
    out_eta = doc.out_eta or "TBA"
    ted = doc.ted or "TBA"

    report_block = (
        f"*Machine*: {machine_label}\n"
        f"*Location*: {location}\n"
        f"*Fleet no*: {fleet_no}\n"
        f"*Date of BD*: {bd_date}\n"
        f"*Duration*: {duration}\n"
        f"*Description*: {description}\n"
        f"*Status*: {status}\n"
        f"*TED Status*: {ted_status}\n"
        f"*Parts ETA*: {parts_eta}\n"
        f"*Outwork ETA*: {out_eta}\n"
        f"*TED*: {ted}\n"
    )

    footer = (
        "```\n"
        "Key acronyms\n"
        "VC – Valued Customer\n"
        "TED – Target End Date\n"
        "RED – Revised End Date\n"
        "ETA – Expected Time of Arrival (normally for parts)\n"
        "```"
    )

    message = (
        "Dear Valued Customer,\n\n"
        "Herewith the *Urgent Daily Breakdown Report (uDBR)* for your machine(s) that we are working on:\n\n"
        f"{report_block}\n"
    )

    if include_footer:
        message += footer

    return message


# -------------------------------------------------------------------
# Main handler
# -------------------------------------------------------------------


@frappe.whitelist(allow_guest=True)
def handle():
    raw = frappe.request.get_data(as_text=True) or "{}"
    try:
        data = json.loads(raw)
    except Exception:
        frappe.log_error(raw, "Invalid JSON from Whapi")
        return {"ok": False}

    messages = data.get("messages") or []

    for msg in messages:
        msg_type = msg.get("type")
        chat_id = msg.get("chat_id")

        if msg_type == "text" and msg.get("from_me"):
            continue  # ignore our own texts

        if msg_type == "reply":
            reply = msg.get("reply") or {}
            rtype = reply.get("type")
            if rtype == "buttons_reply":
                _handle_buttons_reply(msg)
            elif rtype == "list_reply":
                _handle_list_reply(msg)

        elif msg_type == "interactive":
            interactive = msg.get("interactive") or {}
            rtype = interactive.get("type")

            # Button reply (Approve & Send / Edit on main card)
            if rtype in ("button_reply", "buttons_reply"):
                btn = interactive.get("button_reply") or {}
                btn_id = btn.get("id")
                if btn_id:
                    fake = {
                        "chat_id": chat_id,
                        "reply": {
                            "type": "buttons_reply",
                            "buttons_reply": {"id": btn_id},
                        },
                    }
                    _handle_buttons_reply(fake)

            # List Reply (field edit)
            elif rtype in ("list_reply", "list"):
                lr = interactive.get("list_reply") or interactive.get("list") or {}
                row_id = lr.get("id")
                if row_id:
                    fake = {
                        "chat_id": chat_id,
                        "reply": {"type": "list_reply", "list_reply": {"id": row_id}},
                    }
                    _handle_list_reply(fake)

        elif msg_type == "text":
            _handle_text_reply(msg)

    return {"ok": True}


# -------------------------------------------------------------------
# Button handler (Approve / Edit)
# -------------------------------------------------------------------


def _parse_button_token(button_id: str):
    raw = button_id.split(":")[-1]
    parts = raw.split("|")
    if len(parts) != 3:
        return None, None, None
    kind, ref, action = parts
    if kind != "BD":
        return None, None, None
    if action not in ("APPROVE", "EDIT"):
        return None, None, None
    return kind, ref, action


def _handle_buttons_reply(msg):
    btn_id = msg["reply"]["buttons_reply"]["id"]
    chat_id = msg["chat_id"]
    kind, ref, action = _parse_button_token(btn_id)
    if not kind:
        return
    _handle_single_decision(ref, action, chat_id)


# -------------------------------------------------------------------
# APPROVE (approve + send to CSG) + EDIT
# -------------------------------------------------------------------


def _handle_single_decision(docname, action, chat_id):
    cache = frappe.cache()

    try:
        doc = frappe.get_doc("FT Breakdown Log", docname)
    except Exception:
        return

    # ----------------------------------------------------------
    # APPROVE – approve + send to customer group immediately
    # ----------------------------------------------------------
    if action == "APPROVE":
        # Mark as approved
        doc.supervisor_approved = 1
        doc.supervisor_approved_on = now_datetime()
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # Session counts (same as original)
        total = frappe.utils.cint(cache.get_value(f"bd_session_total::{chat_id}") or 0)
        approved = (
            frappe.utils.cint(
                cache.get_value(f"bd_session_approved::{chat_id}") or 0
            )
            + 1
        )
        cache.set_value(
            f"bd_session_approved::{chat_id}", approved, expires_in_sec=3600
        )

        if total:
            progress = f"{approved}/{total} breakdowns approved so far."
        else:
            progress = "Your approval has been logged."

        # Look up customer + group id
        customer = getattr(doc, "customer", None)
        if not customer:
            _send_text(
                chat_id,
                f"Got it ✅ {progress}\n\n"
                "Note: No *Customer* is set on this Breakdown Log, so I can't send to the CSG.",
            )
            _update_doc_status(chat_id, docname, "approved")
            return

        group_id = frappe.db.get_value("FT Customer", customer, "whatsapp_group_id")
        if not group_id:
            _send_text(
                chat_id,
                f"Got it ✅ {progress}\n\n"
                f"Customer *{customer}* has no *WhatsApp Group ID* set, so I can't send to the CSG.\n"
                "Please ask Technical Support to set it on the FT Customer record.",
            )
            _update_doc_status(chat_id, docname, "approved")
            return

        # Check permanent DB flag for acronyms footer
        acronyms_sent = frappe.db.get_value(
            "FT Customer", customer, "udbr_acronyms_sent"
        )
        include_footer = not bool(acronyms_sent)

        # Build customer message
        message = _format_customer_update(doc, include_footer=include_footer)

        # Send to CSG using the same pattern as supervisor send
        try:
            _send_text(group_id, message)
            group_msg = (
                "I've sent the update to the customer's WhatsApp group (CSG).\n"
                f"Group ID: `{group_id}`"
            )
            # Mark footer as permanently sent
            if include_footer:
                frappe.db.set_value(
                    "FT Customer", customer, "udbr_acronyms_sent", 1
                )
                frappe.db.commit()
        except Exception:
            group_msg = (
                "Error sending to the customer's WhatsApp group (CSG). "
                "Technical Support has been notified."
            )

        # Update status badge / cache
        _update_doc_status(chat_id, docname, "approved")

        # Send confirmation back to supervisor
        preview_text = (
            f"Got it ✅ {progress}\n\n"
            f"{group_msg}\n\n"
            "Here is the message that was sent to the CSG:\n\n"
            f"{message}"
        )
        _send_text(chat_id, preview_text)
        return

    # ----------------------------------------------------------
    # EDIT – field-based edit menu (existing behaviour)
    # ----------------------------------------------------------
    if action == "EDIT":
        _send_edit_field_picker(docname, chat_id)


# -------------------------------------------------------------------
# Edit menu + field selection handlers (unchanged)
# -------------------------------------------------------------------


def _send_edit_field_picker(docname, chat_id):
    doc = frappe.get_doc("FT Breakdown Log", docname)

    fields = [
        ("description", "Description", doc.description or "No description"),
        ("status", "Status", doc.status or "Unset"),
        ("ted_status", "TED Status", doc.ted_status or "Unset"),
        ("parts_eta", "Parts ETA", str(doc.parts_eta or "TBA")),
        ("ted", "TED", str(doc.ted or "TBA")),
        ("out_eta", "Outwork ETA", str(doc.out_eta or "TBA")),
    ]

    rows = [
        {"id": f"EDF|{doc.name}|{f}", "title": label, "description": f"Current: {curr}"}
        for f, label, curr in fields
    ]

    sections = [{"title": "Fields to edit", "rows": rows}]

    _send_list(
        to=chat_id,
        header="Edit Breakdown fields",
        body=f"Choose which field you'd like to edit for Breakdown *{docname}*.",
        footer="Pick a field to update.",
        sections=sections,
        label="Select field to edit",
    )

    frappe.cache().set_value(f"bd_edit_doc::{chat_id}", docname, expires_in_sec=600)


def _handle_list_reply(msg):
    chat_id = msg["chat_id"]
    raw_id = msg["reply"]["list_reply"]["id"]

    if "EDF|" not in raw_id:
        return

    clean = raw_id[raw_id.index("EDF|") :]
    _, docname, fieldname = clean.split("|")

    frappe.cache().set_value(
        f"bd_edit_pending::{chat_id}",
        json.dumps({"docname": docname, "fieldname": fieldname}),
        expires_in_sec=600,
    )

    labels = {
        "description": "Description",
        "status": "Status",
        "ted_status": "TED Status",
        "parts_eta": "Parts ETA (YYYY-MM-DD)",
        "ted": "TED (YYYY-MM-DD)",
        "out_eta": "Outwork ETA (YYYY-MM-DD)",
    }

    _send_text(
        chat_id,
        f"📝 Please send the new *{labels[fieldname]}* for Breakdown *{docname}*.",
    )


# -------------------------------------------------------------------
# Text handler (field value updates)
# -------------------------------------------------------------------


def _handle_text_reply(msg):
    chat_id = msg.get("chat_id")
    if not chat_id or msg.get("from_me"):
        return

    text = (msg.get("text") or {}).get("body") or ""
    cache = frappe.cache()

    pending = cache.get_value(f"bd_edit_pending::{chat_id}")
    if not pending:
        return  # nothing waiting for update

    cache.delete_value(f"bd_edit_pending::{chat_id}")
    info = json.loads(pending)

    docname = info["docname"]
    fieldname = info["fieldname"]

    try:
        doc = frappe.get_doc("FT Breakdown Log", docname)
    except frappe.DoesNotExistError:
        return

    if fieldname in {"parts_eta", "ted", "out_eta"}:
        try:
            value = getdate(text)
        except Exception:
            _send_text(chat_id, "⚠ Please use YYYY-MM-DD format.")
            frappe.cache().set_value(
                f"bd_edit_pending::{chat_id}", pending, expires_in_sec=600
            )
            return
    else:
        value = text

    doc.set(fieldname, value)
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    _update_doc_status(chat_id, docname, "pending")

    labels = {
        "description": "Description",
        "status": "Status",
        "ted_status": "TED Status",
        "parts_eta": "Parts ETA",
        "ted": "TED",
        "out_eta": "Outwork ETA",
    }

    _send_text(
        chat_id,
        f"✅ Updated *{labels[fieldname]}* for Breakdown {docname}.",
    )
