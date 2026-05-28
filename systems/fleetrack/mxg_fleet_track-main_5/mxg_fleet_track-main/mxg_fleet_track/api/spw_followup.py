# -*- coding: utf-8 -*-
"""
SPW (Spare Parts Follow Up)

DocType: "SPW Follow Up"

This module handles:
- Finding SPW follow-ups due on a given day
- Sending WhatsApp interactive messages via Whapi (SPW::<docname>::ACTION)
- Handling Whapi webhook button replies and updating the SPW Follow Up doc
- Sending email reminders
- Providing dashboard stats for a custom HTML block
"""

from __future__ import annotations

import datetime
import json
from typing import Dict, List, Optional

import requests
import frappe


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# You can still keep these in site_config.json if you like:
#   "whapi_base": "https://gate.whapi.cloud",
#   "whapi_token_spw": "YOUR_TOKEN_HERE"
#
# But we also hardcode defaults here so SPW can run even if config is missing.

# 1) Base URL – will use site_config if present, otherwise default:
WHAPI_BASE = frappe.conf.get("whapi_base") or "https://gate.whapi.cloud"

# 2) TOKEN – will use site_config if present, otherwise the hard-coded value below.
#    👉 REPLACE "PASTE_YOUR_SPW_WHAPI_TOKEN_HERE" with your actual Whapi token.
WHAPI_TOKEN = (
    frappe.conf.get("whapi_token_spw")
    or "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"
)


def _today() -> datetime.date:
    """Return today's date (server time)."""
    return datetime.date.today()


# ---------------------------------------------------------------------------
# Core query helpers
# ---------------------------------------------------------------------------

def get_due_spw_followups(for_date: Optional[datetime.date] = None) -> List[Dict]:
    """
    Return all "SPW Follow Up" docs due on a given date and still open
    (Open + intermediate follow-up statuses).
    """
    if not for_date:
        for_date = _today()

    return frappe.get_all(
        "SPW Follow Up",
        filters={
            "next_followup_date": for_date,
            "status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]],
        },
        fields=[
            "name",
            "sage_quote_no",
            "customer",
            "whatsapp_no",
            "email_id",
            "salesperson",
            "quote_date",
            "followup_stage",
            "quote_value",
        ],
    )


# ---------------------------------------------------------------------------
# Outbound notifications (scheduler entry point)
# ---------------------------------------------------------------------------

def send_daily_spw_notifications():
    """
    Scheduler entry (daily).

    - Find all SPW Follow Up docs that are due today.
    - Send WhatsApp interactive messages.
    - Optionally send email reminders.
    """
    due_list = get_due_spw_followups()
    if not due_list:
        return

    for row in due_list:
        # WhatsApp
        if row.get("whatsapp_no"):
            try:
                send_spw_whatsapp(row)
            except Exception:
                frappe.log_error(
                    frappe.get_traceback(),
                    "SPW WhatsApp send failed"
                )

        # Email
        if row.get("email_id"):
            try:
                send_spw_email(row)
            except Exception:
                frappe.log_error(
                    frappe.get_traceback(),
                    "SPW Email send failed"
                )


# ---------------------------------------------------------------------------
# WhatsApp interactive message (outbound)
# ---------------------------------------------------------------------------

def send_spw_whatsapp(row: Dict):
    """
    Send interactive WhatsApp message via Whapi for one SPW follow-up row.

    Expected row keys (from get_all):
      name, sage_quote_no, customer, whatsapp_no, salesperson, quote_date,
      followup_stage, quote_value
    """
    if not WHAPI_BASE or not WHAPI_TOKEN or "PASTE_YOUR_SPW_WHAPI_TOKEN_HERE" in WHAPI_TOKEN:
        frappe.throw("WHAPI config missing: please set WHAPI_BASE / WHAPI_TOKEN in spw_followup.py")

    to = row["whatsapp_no"]
    docname = row["name"]
    stage = row.get("followup_stage") or 0

    # Human label for which follow-up this is
    stage_label = {0: "1st", 1: "2nd", 2: "3rd"}.get(stage, "Next")

    body_text = (
        f"*SPW Spare Parts Follow Up ({stage_label})*\n\n"
        f"Quote: *{row.get('sage_quote_no') or 'N/A'}*\n"
        f"Customer: *{row.get('customer') or 'N/A'}*\n"
        f"Value: {frappe.utils.fmt_money(row.get('quote_value') or 0)}\n\n"
        f"Please select an update below:"
    )

    payload = {
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "footer": {"text": "SPW Spare Parts Follow Up"},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {
                            "id": f"SPW::{docname}::FOLLOWED",
                            "title": "✅ Followed up",
                        },
                    },
                    {
                        "type": "reply",
                        "reply": {
                            "id": f"SPW::{docname}::WON",
                            "title": "🟢 Won",
                        },
                    },
                    {
                        "type": "reply",
                        "reply": {
                            "id": f"SPW::{docname}::LOST",
                            "title": "🔴 Lost",
                        },
                    },
                ]
            },
        },
    }

    headers = {
        "Authorization": f"Bearer {WHAPI_TOKEN}",
        "Content-Type": "application/json",
    }

    url = f"{WHAPI_BASE.rstrip('/')}/messages"

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=15)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "WHAPI SPW connection error"
        )
        return

    if not r.ok:
        frappe.log_error(
            f"Status: {r.status_code}\nBody: {r.text}",
            "WHAPI SPW send error",
        )


# ---------------------------------------------------------------------------
# Email notification (simple version)
# ---------------------------------------------------------------------------

def send_spw_email(row: Dict):
    """
    Send a simple email reminder for an SPW follow-up row.
    """
    subject = f"SPW Follow Up: {row.get('sage_quote_no') or 'N/A'}"

    message = f"""
    <p>Dear {row.get('salesperson') or 'Salesperson'},</p>
    <p>Please follow up the spare parts quotation:</p>
    <ul>
      <li><b>Quote No:</b> {row.get('sage_quote_no') or 'N/A'}</li>
      <li><b>Customer:</b> {row.get('customer') or 'N/A'}</li>
      <li><b>Quote Date:</b> {row.get('quote_date') or 'N/A'}</li>
      <li><b>Value:</b> {frappe.utils.fmt_money(row.get('quote_value') or 0)}</li>
    </ul>
    <p>This quotation is due for follow-up as per the SPW (Spare Parts Follow Up)
    2 / 4 / 6 day policy.</p>
    <p>Regards,<br>SPW Spare Parts Follow Up System</p>
    """

    frappe.sendmail(
        recipients=[row["email_id"]],
        subject=subject,
        message=message,
    )


# ---------------------------------------------------------------------------
# Whapi webhook → SPW Follow Up update
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def whapi_spw_webhook():
    """
    Webhook endpoint for Whapi interactive button replies.

    Configure Whapi to POST here, e.g.:
      https://your.site/api/method/powerstar_salestrack.api.spw_followup.whapi_spw_webhook

    Expected structure (simplified):
    {
      "event": {...},
      "messages": [
        {
          "type": "interactive",
          "from": "2637.....",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "SPW::<DOCNAME>::WON",
              "title": "🟢 Won"
            }
          }
        }
      ]
    }
    """
    data = frappe.local.form_dict or {}
    if not data:
        raw = frappe.request.data
        try:
            data = json.loads(raw)
        except Exception:
            frappe.log_error(raw, "SPW webhook invalid JSON")
            return

    try:
        messages = data.get("messages") or []
        for msg in messages:
            if msg.get("type") != "interactive":
                continue

            interactive = msg.get("interactive") or {}
            if interactive.get("type") != "button_reply":
                continue

            btn = interactive.get("button_reply") or {}
            btn_id = btn.get("id")  # "SPW::<DOCNAME>::ACTION"
            if not btn_id or not btn_id.startswith("SPW::"):
                continue

            try:
                _, docname, action = btn_id.split("::", 2)
            except ValueError:
                # If splitting fails for some weird ID format
                continue

            _apply_spw_action(docname, action, msg)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "SPW webhook processing failed"
        )


def _apply_spw_action(docname: str, action: str, msg: Dict):
    """
    Apply a button action from WhatsApp to the SPW Follow Up document.

    Actions:
      - FOLLOWED : mark this follow-up done, advance the stage
      - WON      : mark as Won, stop scheduling
      - LOST     : mark as Lost, stop scheduling

    2 / 4 / 6 day logic:

      followup_stage = 0  → 1st follow-up (2 days from quote_date)
      followup_stage = 1  → 2nd follow-up (4 days from quote_date)
      followup_stage = 2  → 3rd follow-up (6 days from quote_date)

    After 3rd follow-up (stage >= 3), we stop scheduling next_followup_date.
    """
    doc = frappe.get_doc("SPW Follow Up", docname)
    today = frappe.utils.nowdate()

    note_action = {
        "FOLLOWED": "Follow-up done via WhatsApp",
        "WON": "Quote converted to sale via WhatsApp",
        "LOST": "Quote marked as lost via WhatsApp",
    }.get(action, "Updated via WhatsApp")

    # FOLLOWED: advance stage & move next_followup_date
    if action == "FOLLOWED":
        doc.followup_stage = (doc.followup_stage or 0) + 1

        # Stage 1 = 2-day follow-up completed → schedule 4-day follow-up
        if doc.followup_stage == 1:
            doc.status = "Follow-up 1 Done"
            if doc.quote_date:
                doc.next_followup_date = frappe.utils.add_days(doc.quote_date, 4)
            else:
                doc.next_followup_date = None

        # Stage 2 = 4-day follow-up completed → schedule 6-day follow-up
        elif doc.followup_stage == 2:
            doc.status = "Follow-up 2 Done"
            if doc.quote_date:
                doc.next_followup_date = frappe.utils.add_days(doc.quote_date, 6)
            else:
                doc.next_followup_date = None

        # Stage >= 3 = 6-day follow-up completed → stop scheduling
        elif doc.followup_stage >= 3:
            doc.status = "Follow-up 3 Done"
            doc.next_followup_date = None

    # WON: mark as Won & stop scheduling
    elif action == "WON":
        doc.status = "Won"
        doc.next_followup_date = None

    # LOST: mark as Lost & stop scheduling
    elif action == "LOST":
        doc.status = "Lost"
        doc.next_followup_date = None

    # Common updates
    doc.last_followup_date = today
    doc.last_followup_note = note_action
    doc.is_overdue = 0

    doc.save(ignore_permissions=True)
    frappe.db.commit()


# ---------------------------------------------------------------------------
# Dashboard stats API (for Custom HTML block)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_spw_dashboard_stats(from_date: Optional[str] = None,
                            to_date: Optional[str] = None) -> Dict:
    """
    Return KPIs + lists for SPW dashboard.

    Args:
      from_date (str, yyyy-mm-dd) : week start (defaults to today)
      to_date   (str, yyyy-mm-dd) : week end   (defaults to from_date + 6 days)

    Response:
    {
      "kpis": {...},
      "today_list": [...],
      "week_list": [...],
      "upcoming_list": [...]
    }
    """
    if not from_date:
        from_date = frappe.utils.nowdate()
    if not to_date:
        to_date = frappe.utils.add_days(from_date, 6)

    today = frappe.utils.nowdate()
    upcoming_from = frappe.utils.add_days(today, 1)
    upcoming_to = frappe.utils.add_days(today, 14)

    # Today
    due_today = frappe.get_all(
        "SPW Follow Up",
        filters={
            "next_followup_date": today,
            "status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]],
        },
        fields=[
            "name",
            "sage_quote_no",
            "customer",
            "quote_value",
            "salesperson",
            "next_followup_date",
        ],
        order_by="sage_quote_no asc",
    )

    # This week (based on selected week range)
    due_week = frappe.get_all(
        "SPW Follow Up",
        filters={
            "next_followup_date": ["between", [from_date, to_date]],
            "status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]],
        },
        fields=[
            "name",
            "sage_quote_no",
            "customer",
            "quote_value",
            "salesperson",
            "next_followup_date",
        ],
        order_by="next_followup_date asc, sage_quote_no asc",
    )

    # Overdue
    overdue = frappe.get_all(
        "SPW Follow Up",
        filters={
            "next_followup_date": ["<", today],
            "status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]],
        },
        fields=["name"],
    )

    # Upcoming: next 14 days from today (excluding today)
    upcoming = frappe.get_all(
        "SPW Follow Up",
        filters={
            "next_followup_date": ["between", [upcoming_from, upcoming_to]],
            "status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]],
        },
        fields=[
            "name",
            "sage_quote_no",
            "customer",
            "quote_value",
            "salesperson",
            "next_followup_date",
            "followup_stage",
        ],
        order_by="next_followup_date asc, sage_quote_no asc",
    )

    # Open total
    open_total = frappe.db.count(
        "SPW Follow Up",
        filters={"status": ["in", ["Open", "Follow-up 1 Done", "Follow-up 2 Done"]]},
    )

    return {
        "kpis": {
            "due_today": len(due_today),
            "due_this_week": len(due_week),
            "overdue": len(overdue),
            "open_total": open_total,
        },
        "today_list": due_today,
        "week_list": due_week,
        "upcoming_list": upcoming,
    }
