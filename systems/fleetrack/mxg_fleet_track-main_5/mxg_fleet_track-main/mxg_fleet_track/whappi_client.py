# mxg_fleet_track/whappi_client.py

from __future__ import annotations
import frappe
import requests

# ---------------- Whappi configuration ----------------
# Option 1: Hard-code (fast for internal use, but don't commit real token to public git)
WHAPPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"
WHAPPI_URL = "https://gate.whapi.cloud/messages/text"  # change to your endpoint

# Option 2 (optional): override from site_config.json if present
_conf = frappe._dict(frappe.conf or {})
WHAPPI_TOKEN = _conf.get("whappi_token", WHAPPI_TOKEN)
WHAPPI_URL = _conf.get("whappi_url", WHAPPI_URL)


def send_whatsapp_group_message(group_id: str, message: str) -> dict:
    """
    Send a text message to a WhatsApp group via Whappi.

    group_id: WhatsApp group ID / chatId
    message: full text body to send
    """
    if not group_id:
        raise ValueError("group_id is required")
    if not message:
        raise ValueError("message text is required")

    if not WHAPPI_TOKEN or not WHAPPI_URL:
        frappe.throw("Whappi configuration (WHAPPI_TOKEN/WHAPPI_URL) is missing.")

    headers = {
        "Authorization": f"Bearer {WHAPPI_TOKEN}",
        "Content-Type": "application/json",
    }

    # Adjust keys exactly to match your Whappi API
    payload = {
        "to": group_id,      # or "chatId"/"groupId" depending on your gateway
        "body": message,
    }

    try:
        resp = requests.post(WHAPPI_URL, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Whappi group send failed")
        frappe.throw(f"Failed to send WhatsApp via Whappi: {e}")

    return resp.json() if resp.content else {"ok": True}
