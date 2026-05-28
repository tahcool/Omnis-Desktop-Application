# mxg_fleet_track/breakdown_whatsapp.py

from __future__ import annotations
import frappe

from .whappi_client import send_whatsapp_group_message


@frappe.whitelist()
def send_breakdown_whatsapp_update(name: str):
    """
    Send uDBR / DBR WhatsApp message for a single FT Breakdown Log entry.
    Called from the FT Breakdown Log client script.
    """
    # 1) Load Breakdown Log
    doc = frappe.get_doc("FT Breakdown Log", name)

    # 2) Get customer + WhatsApp group ID
    if not doc.customer:
        frappe.throw("Customer is required to send WhatsApp notification.")

    customer_name, group_id = frappe.db.get_value(
        "FT Customer",
        doc.customer,
        ["customer_name", "whatsapp_group_id"],
    ) or (None, None)

    if not group_id:
        frappe.throw(
            "No WhatsApp Group ID found on the linked Customer. "
            "Please set 'WhatsApp Group ID' on the FT Customer."
        )

    # 3) Build message text (same structure as the JS preview)
    message = _compose_breakdown_message(doc, customer_name, group_id)

    # 4) Send via Whappi helper
    send_whatsapp_group_message(group_id, message)

    # 5) Optional: log back to the document
    doc.add_comment(
        "Info",
        f"WhatsApp {'uDBR' if doc.urgent else 'DBR'} sent to group {group_id}.",
    )
    doc.save(ignore_permissions=True)

    return {"ok": True, "group_id": group_id}


def _compose_breakdown_message(doc, customer_name: str | None, group_id: str) -> str:
    """Build the exact message text, mirroring the client-side preview."""
    customer_name = (
        customer_name
        or doc.get("customer_name")
        or doc.get("customer")
        or "Customer"
    ).strip()

    def fmt_date(d):
        return frappe.format(d, {"fieldtype": "Date"}) if d else None

    # Map possible field names
    hmr = doc.get("hmr") or doc.get("hmr_reading") or "-"
    fleet_no = doc.get("fleet_no") or doc.get("fleet_number") or "-"
    tech = doc.get("tech_attending") or doc.get("technician") or "-"

    location = doc.get("location") or "-"
    duration = doc.get("days_on_bd") or doc.get("bd_duration") or 0
    description = doc.get("description") or "-"
    status = doc.get("status") or "-"

    # Existing ETA logic (kept)
    def _base_eta_text() -> str:
        if doc.get("eta"):
            return str(doc.eta)
        if doc.get("eta_time"):
            return str(doc.eta_time)
        if doc.get("parts_eta"):
            d = fmt_date(doc.parts_eta)
            return f"Parts ETA: {d}" if d else "Parts ETA: TBA"
        if doc.get("out_eta"):
            d = fmt_date(doc.out_eta)
            return f"Outwork ETA: {d}" if d else "Outwork ETA: TBA"
        return "-"

    eta = _base_eta_text()

    # NEW: optional Parts ETA / Outwork ETA fields based on checkboxes
    parts_eta_lines: list[str] = []
    if int(doc.get("parts_eta_available") or 0) == 1:
        d = fmt_date(doc.get("parts_eta"))
        parts_eta_lines.append(f"*Parts ETA*: {d or 'TBA'}")

    outwork_eta_lines: list[str] = []
    if int(doc.get("outwork_eta_availble") or 0) == 1:
        d = fmt_date(doc.get("out_eta"))
        outwork_eta_lines.append(f"*Outwork ETA*: {d or 'TBA'}")

    # TED rules
    ted_status = (doc.get("ted_status") or "").strip()
    show_ted = ted_status != "TBA"  # if TBA, hide TED line completely
    ted_value = fmt_date(doc.get("ted"))
    ted_line = f"*TED*: {ted_value or '-'}"

    bd_date = fmt_date(doc.get("breakdown_date")) or "-"

    is_urgent = bool(doc.get("urgent"))
    report_name = (
        "Urgent Daily Breakdown Report (uDBR)"
        if is_urgent
        else "Daily Breakdown Report (DBR)"
    )

    lines: list[str] = [
        "*Dear Valued Customer*,",
        "",
        f"Herewith the *{report_name}* for your machine(s) that we are working on:",
        "",
        f"*Customer*: {customer_name}",
        f"*Machine*: {doc.get('machine') or '-'}",
        f"*HMR*: {hmr}",
        f"*Location*: {location}",
        f"*Fleet no*: {fleet_no}",
        f"*Date of BD*: {bd_date}",
        f"*Duration*: {duration}",
        f"*Description*: {description}",
        f"*Status*: {status}",
        f"*ETA*: {eta}",
    ]

    # Add optional ETA lines only when allowed by checkboxes
    lines.extend(parts_eta_lines)
    lines.extend(outwork_eta_lines)

    lines.append(f"*Tech attending*: {tech}")

    # Add TED only if ted_status is NOT TBA
    if show_ted:
        lines.append(ted_line)

    lines.extend([
        "",
        "",
        "*Best Regards, Fleetrack*",
    ])

    return "\n".join(lines)
