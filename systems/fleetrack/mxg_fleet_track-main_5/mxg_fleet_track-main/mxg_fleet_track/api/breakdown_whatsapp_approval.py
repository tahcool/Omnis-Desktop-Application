# -*- coding: utf-8 -*-
"""
FT Breakdown Log → Supervisor approval via WhatsApp (Whapi Cloud)

CUSTOM RULES:
- If TED Status (ted_status) == "TBA" -> DO NOT show TED field
- Show Parts ETA ONLY if parts_eta_available == 1, else hide it
- Show Outwork ETA ONLY if outwork_eta_availble == 1, else hide it
- If checkbox is ticked but date is empty -> show TBA
"""

from __future__ import annotations

import json
import re
from typing import List, Optional

import requests
import frappe
from frappe.utils import now_datetime
from frappe import _

# -------------------------------------------------------------------
# Whapi config
# -------------------------------------------------------------------

WHAPI_BASE = "https://gate.whapi.cloud"

# ✅ Prefer site_config.json:  "whapi_token": "YOUR_TOKEN"
WHAPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"


def _get_whapi_token() -> str:
    token = (WHAPI_TOKEN or frappe.conf.get("whapi_token") or "").strip()
    if not token:
        raise Exception("Whapi token is missing. Set WHAPI_TOKEN or frappe.conf['whapi_token']")
    return token


def _whapi_headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_whapi_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _normalize_to(to: str) -> str:
    """
    Normalise WhatsApp 'to' field for Whapi:

    - If it already looks like an ID (has '@', e.g. '12032@g.us'), return as is.
    - Otherwise, strip everything that is NOT a digit
      (so '+263 77 692 6803' -> '263776926803').
    """
    to = (to or "").strip()
    if "@" in to:
        return to
    digits = re.sub(r"\D", "", to)
    return digits


def _send_whapi_interactive(
    to: str,
    header: str,
    body: str,
    footer: str,
    buttons: list[dict],
) -> dict:
    """Send interactive quick-reply buttons via Whapi Cloud."""
    to_norm = _normalize_to(to)

    payload = {
        "header": {"text": header},
        "body": {"text": body},
        "footer": {"text": footer},
        "action": {"buttons": buttons},
        "type": "button",
        "to": to_norm,
    }

    resp = requests.post(
        f"{WHAPI_BASE}/messages/interactive",
        headers=_whapi_headers(),
        data=json.dumps(payload),
        timeout=15,
    )
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    if not resp.ok:
        frappe.log_error(
            f"Status: {resp.status_code}\nPayload:\n{json.dumps(payload, indent=2)}\n\nResponse:\n{resp.text}",
            "Whapi Breakdown interactive send failed",
        )
        raise Exception(f"Whapi interactive send failed: HTTP {resp.status_code}")

    return data


def _send_whapi_text(to: str, body: str) -> None:
    to_norm = _normalize_to(to)
    payload = {"to": to_norm, "body": body}
    resp = requests.post(
        f"{WHAPI_BASE}/messages/text",
        headers=_whapi_headers(),
        data=json.dumps(payload),
        timeout=15,
    )
    if not resp.ok:
        frappe.log_error(
            f"Status: {resp.status_code}\nPayload:\n{json.dumps(payload, indent=2)}\n\nResponse:\n{resp.text}",
            "Whapi Breakdown text send failed",
        )


# -------------------------------------------------------------------
# OPTIONAL: OpenAI config for fancy greeting
# -------------------------------------------------------------------

# ✅ Prefer site_config.json: "openai_api_key": "YOUR_KEY"
OPENAI_API_KEY = "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"
OPENAI_MODEL = "gpt-4.1-mini"


def _ai_greeting(supervisor_name: str, title: str) -> Optional[str]:
    """
    Use OpenAI to generate a friendly greeting line.
    Returns None if API key / library not available or call fails.
    """
    api_key = (OPENAI_API_KEY or frappe.conf.get("openai_api_key") or "").strip()
    if not api_key:
        return None

    try:
        from openai import OpenAI  # requires `pip install openai`
    except ImportError:
        return None

    client = OpenAI(api_key=api_key)

    hour = now_datetime().hour
    if hour < 12:
        tod = "morning"
    elif hour < 17:
        tod = "afternoon"
    else:
        tod = "evening"

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise, friendly assistant used inside a "
                        "WhatsApp breakdown-report system. "
                        "Respond with ONE short greeting line only, no list, "
                        "mentioning the person's name and time of day. "
                        "Maximum 15 words. Do NOT repeat the UDBR title."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Name: {supervisor_name}\n"
                        f"Time of day: {tod}\n"
                        f"UDBR title: {title}"
                    ),
                },
            ],
            max_tokens=50,
        )
        text = resp.choices[0].message.content.strip()
        return text.split("\n")[0]
    except Exception:
        return None


def _basic_greeting(supervisor_name: str) -> str:
    """Fallback greeting just based on time-of-day, no OpenAI."""
    hour = now_datetime().hour
    if hour < 12:
        prefix = "Good morning"
    elif hour < 17:
        prefix = "Good afternoon"
    else:
        prefix = "Good evening"
    return f"{prefix}, {supervisor_name}"


def _generate_greeting(supervisor_name: str, title: str) -> str:
    """Try OpenAI greeting first, else fallback."""
    ai_line = _ai_greeting(supervisor_name, title)
    if ai_line:
        return ai_line
    return _basic_greeting(supervisor_name)


# -------------------------------------------------------------------
# Formatting helpers
# -------------------------------------------------------------------

def _format_single_bd_body(doc, supervisor_name: str) -> str:
    """WhatsApp-friendly summary for ONE Breakdown."""
    customer = doc.customer or "TBA"
    machine = doc.machine or "TBA"
    location = doc.location or "TBA"
    fleet_no = getattr(doc, "fleet_no", None) or "TBA"
    bd_date = doc.breakdown_date or "TBA"
    duration = doc.days_on_bd or doc.bd_duration or "TBA"
    desc = doc.description or "No description"
    status = doc.status or "TBA"

    ted_status = (doc.ted_status or "TBA").strip()
    ted = doc.ted or "TBA"

    # ✅ Correct checkbox checks (prevents None/"" from becoming True)
    parts_eta_show = (doc.get("parts_eta_available") == 1)
    out_eta_show = (doc.get("outwork_eta_availble") == 1)

    parts_eta_val = doc.parts_eta or "TBA"
    out_eta_val = doc.out_eta or "TBA"

    greeting = _generate_greeting(supervisor_name, doc.name)

    lines = [
        f"{greeting},",
        "",
        f"*Breakdown pending approval* (Doc: *{doc.name}*)",
        "",
        f"*Customer*: {customer}",
        f"*Machine*: {machine}",
        f"*Location*: {location}",
        f"*Fleet no*: {fleet_no}",
        f"*Date of BD*: {bd_date}",
        f"*Duration*: {duration}",
        f"*Description*: {desc}",
        f"*Status*: {status}",
        f"*TED Status*: {ted_status}",
    ]

    if parts_eta_show:
        lines.append(f"*Parts ETA*: {parts_eta_val}")

    if out_eta_show:
        lines.append(f"*Outwork ETA*: {out_eta_val}")

    # ✅ Hide TED when ted_status is TBA
    if ted_status.lower() != "tba":
        lines.append(f"*TED*: {ted}")

    lines.append("")
    return "\n".join(lines)


def _format_bd_line(idx: int, doc) -> str:
    """One entry inside the UDBR list (for the summary message)."""
    customer = doc.customer or "TBA"
    machine = doc.machine or "TBA"
    location = doc.location or "TBA"
    fleet_no = getattr(doc, "fleet_no", None) or "TBA"
    bd_date = doc.breakdown_date or "TBA"
    duration = doc.days_on_bd or doc.bd_duration or "TBA"
    desc = doc.description or "No description"
    status = doc.status or "TBA"

    ted_status = (doc.ted_status or "TBA").strip()
    ted = doc.ted or "TBA"

    # ✅ Correct checkbox checks
    parts_eta_show = (doc.get("parts_eta_available") == 1)
    out_eta_show = (doc.get("outwork_eta_availble") == 1)

    parts_eta_val = doc.parts_eta or "TBA"
    out_eta_val = doc.out_eta or "TBA"

    lines = [
        f"{idx}) *Customer*: {customer}",
        f"   *Machine*: {machine}",
        f"   *Location*: {location}",
        f"   *Fleet no*: {fleet_no}",
        f"   *Date of BD*: {bd_date}",
        f"   *Duration*: {duration}",
        f"   *Description*: {desc}",
        f"   *Status*: {status}",
        f"   *TED Status*: {ted_status}",
    ]

    if parts_eta_show:
        lines.append(f"   *Parts ETA*: {parts_eta_val}")

    if out_eta_show:
        lines.append(f"   *Outwork ETA*: {out_eta_val}")

    if ted_status.lower() != "tba":
        lines.append(f"   *TED*: {ted}")

    return "\n".join(lines) + "\n"


def _format_batch_body(
    title: str,
    docs: List[frappe.model.document.Document],
    supervisor_name: str,
) -> str:
    """UDBR-style summary for multiple Breakdown Logs."""
    greeting = _generate_greeting(supervisor_name, title)
    lines = [
        f"{greeting},",
        "",
        f"*{title}*",
        "",
    ]
    for i, d in enumerate(docs, start=1):
        lines.append(_format_bd_line(i, d))

    lines.append("\nPlease review this UDBR and approve/edit each breakdown.")
    return "\n".join(lines)


# -------------------------------------------------------------------
# SINGLE-DOC SEND
# -------------------------------------------------------------------
@frappe.whitelist()
def send_to_supervisor_whatsapp(docname: str, supervisor_name: str, supervisor_mobile: str):
    """Send ONE Breakdown Log to supervisor with [Approve & Send] [Edit] buttons."""
    doc = frappe.get_doc("FT Breakdown Log", docname)

    header = "Breakdown Approval"
    body = _format_single_bd_body(doc, supervisor_name)
    footer = "Tap *Approve & Send* to accept and notify customer, or *Edit* to update fields."

    approve_id = f"BD|{doc.name}|APPROVE"
    edit_id = f"BD|{doc.name}|EDIT"

    buttons = [
        {"type": "quick_reply", "title": "Approve & Send", "id": approve_id},
        {"type": "quick_reply", "title": "Edit", "id": edit_id},
    ]

    resp = _send_whapi_interactive(
        to=supervisor_mobile,
        header=header,
        body=body,
        footer=footer,
        buttons=buttons,
    )

    return {"ok": True, "whapi": resp}


# -------------------------------------------------------------------
# Session tracking helpers
# -------------------------------------------------------------------

def _session_key_for_mobile(mobile: str) -> str:
    """Build a chat_id-like key from a mobile number."""
    return f"{_normalize_to(mobile)}@s.whatsapp.net"


def _load_session(chat_id: str) -> dict | None:
    cache = frappe.cache()
    raw = cache.get_value(f"bd_session_data::{chat_id}")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _save_session(chat_id: str, data: dict) -> None:
    cache = frappe.cache()
    cache.set_value(
        f"bd_session_data::{chat_id}",
        json.dumps(data),
        expires_in_sec=3600,
    )
    raw = cache.get_value("bd_sessions") or "[]"
    try:
        sessions = json.loads(raw)
    except Exception:
        sessions = []
    if chat_id not in sessions:
        sessions.append(chat_id)
        cache.set_value("bd_sessions", json.dumps(sessions), expires_in_sec=3600)


def _clear_session(chat_id: str) -> None:
    cache = frappe.cache()
    cache.delete_value(f"bd_session_data::{chat_id}")
    raw = cache.get_value("bd_sessions") or "[]"
    try:
        sessions = json.loads(raw)
    except Exception:
        sessions = []
    if chat_id in sessions:
        sessions.remove(chat_id)
        cache.set_value("bd_sessions", json.dumps(sessions), expires_in_sec=3600)


def _init_session_for_docs(
    chat_id: str,
    supervisor_name: str,
    supervisor_mobile: str,
    udbr_title: str,
    docs: list[frappe.model.document.Document],
) -> None:
    """Initialise a session record for this chat with all breakdowns."""
    now_iso = now_datetime().isoformat()
    data = {
        "title": udbr_title,
        "supervisor_name": supervisor_name,
        "supervisor_mobile": _normalize_to(supervisor_mobile),
        "docs": {
            d.name: {"status": "pending", "last_sent": now_iso}
            for d in docs
        },
    }
    _save_session(chat_id, data)

    cache = frappe.cache()
    cache.set_value(f"bd_session_total::{chat_id}", len(docs), expires_in_sec=3600)
    cache.set_value(f"bd_session_approved::{chat_id}", 0, expires_in_sec=3600)


@frappe.whitelist()
def run_bd_reminders():
    """Scheduler job (run every minute) to resend pending breakdowns if >60s since last_sent."""
    cache = frappe.cache()
    raw_sessions = cache.get_value("bd_sessions") or "[]"
    try:
        sessions = json.loads(raw_sessions)
    except Exception:
        sessions = []

    if not sessions:
        return

    from frappe.utils import time_diff_in_seconds, get_datetime

    for chat_id in sessions:
        data = _load_session(chat_id)
        if not data:
            continue

        docs_info = data.get("docs") or {}
        if not docs_info:
            _clear_session(chat_id)
            continue

        mobile = data.get("supervisor_mobile")
        if not mobile:
            continue

        supervisor_name = data.get("supervisor_name") or ""

        for docname, info in docs_info.items():
            if info.get("status") != "pending":
                continue

            last_sent = info.get("last_sent")
            try:
                last_dt = get_datetime(last_sent)
            except Exception:
                last_dt = None

            needs_reminder = True if not last_dt else (time_diff_in_seconds(now_datetime(), last_dt) >= 60.0)
            if not needs_reminder:
                continue

            try:
                bd_doc = frappe.get_doc("FT Breakdown Log", docname)
            except frappe.DoesNotExistError:
                continue

            header = f"Reminder – Breakdown {bd_doc.name}"
            body = _format_single_bd_body(bd_doc, supervisor_name)
            body = f"{body}\n\n_Just a quick reminder – still waiting for your approval & send on this breakdown._"
            footer = "Tap *Approve & Send* to accept and notify customer, or *Edit* to update fields."

            approve_id = f"BD|{bd_doc.name}|APPROVE"
            edit_id = f"BD|{bd_doc.name}|EDIT"

            buttons = [
                {"type": "quick_reply", "title": "Approve & Send", "id": approve_id},
                {"type": "quick_reply", "title": "Edit", "id": edit_id},
            ]

            _send_whapi_interactive(
                to=mobile,
                header=header,
                body=body,
                footer=footer,
                buttons=buttons,
            )

            docs_info[docname]["last_sent"] = now_datetime().isoformat()

        data["docs"] = docs_info
        _save_session(chat_id, data)


# -------------------------------------------------------------------
# BATCH SEND
# -------------------------------------------------------------------
@frappe.whitelist()
def send_batch_to_supervisor_whatsapp(
    docnames: list[str] | str,
    udbr_title: str,
    supervisor_name: str,
    supervisor_mobile: str,
):
    """Send MULTIPLE Breakdown Logs as one UDBR list to supervisor."""
    if isinstance(docnames, str):
        try:
            docnames = json.loads(docnames)
        except Exception:
            docnames = [docnames]

    if not docnames:
        frappe.throw("No Breakdown Logs provided")

    all_docs = [frappe.get_doc("FT Breakdown Log", name) for name in docnames]

    docs = [
        d for d in all_docs
        if not d.get("end_date")
        and d.get("resp") == "FSD"
        and int(d.get("urgent") or 0) == 1
    ]

    if not docs:
        frappe.throw(
            "No qualifying Breakdown Logs.\n\n"
            "A record must have:\n"
            "- Breakdown End Date: Not Set\n"
            "- Responsibility: FSD\n"
            "- Urgent: Yes"
        )

    excluded = [d.name for d in all_docs if d not in docs]
    if excluded:
        frappe.msgprint(
            "The following records were NOT included because they do not match "
            "the UDBR filter (End Date empty, Responsibility = FSD, Urgent = Yes):<br>"
            + "<br>".join(excluded)
        )

    # 1) Summary
    summary_body = _format_batch_body(udbr_title, docs, supervisor_name)
    _send_whapi_text(supervisor_mobile, summary_body)

    # 2) Session
    chat_id = _session_key_for_mobile(supervisor_mobile)
    _init_session_for_docs(chat_id, supervisor_name, supervisor_mobile, udbr_title, docs)

    # 3) Interactive per breakdown
    for idx, d in enumerate(docs, start=1):
        header = f"Breakdown {idx}/{len(docs)}"
        body = _format_single_bd_body(d, supervisor_name)
        footer = "Tap *Approve & Send* to accept and notify customer, or *Edit* to update fields."

        approve_id = f"BD|{d.name}|APPROVE"
        edit_id = f"BD|{d.name}|EDIT"

        buttons = [
            {"type": "quick_reply", "title": "Approve & Send", "id": approve_id},
            {"type": "quick_reply", "title": "Edit", "id": edit_id},
        ]

        _send_whapi_interactive(
            to=supervisor_mobile,
            header=header,
            body=body,
            footer=footer,
            buttons=buttons,
        )

        d.add_comment("Comment", f"Sent for WhatsApp approval (UDBR '{udbr_title}').")

    frappe.db.commit()
    return {"ok": True, "count": len(docs)}
