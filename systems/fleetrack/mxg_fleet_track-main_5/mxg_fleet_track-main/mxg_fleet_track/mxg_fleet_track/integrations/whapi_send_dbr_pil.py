
# -*- coding: utf-8 -*-
"""
Fleetrack — Daily Breakdown Report → WhatsApp Image (PIL only, no PDF)

- Calls your DBR report's execute(filters)
- Renders a clean table with Pillow (PIL): title, meta (region), header, zebra rows, borders
- Optional "efficiency" badge if present on the first data row
- Sends PNG via Whapi

Site Config (site_config.json):
{
  "whapi_base":  "https://gate.whapi.cloud",
  "whapi_token": "<YOUR_WA_BEARER_TOKEN>"
}

Call example (browser quick test):
https://salestrack.powerstar.co.zw/api/method/mxg_fleet_track.integrations.whapi_send_dbr_pil.send_ft_dbr_pil_image?to=1234567890@g.us&region=South
"""

from __future__ import annotations

import io
import math
import datetime
from typing import Any, Dict, List

import requests
import frappe
from PIL import Image, ImageDraw, ImageFont

# ── CONFIG ────────────────────────────────────────────────────────────────
# Option A: pull from site_config.json (recommended, safer)
# WHAPI_BASE  = frappe.conf.get("whapi_base")
# WHAPI_TOKEN = frappe.conf.get("whapi_token")

# Option B: hard-code directly (quick + simple)
WHAPI_BASE  = "https://gate.whapi.cloud"          # <- your Whapi base URL
WHAPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt" # <- paste your token string


# ── REPORT IMPORT (adjust if your package path differs) ──────────────────────
# Expected file: mxg_fleet_track/report/daily_breakdown_report_(dbr)/daily_breakdown_report_(dbr).py
try:
    from mxg_fleet_track.report.daily_breakdown_report__dbr.daily_breakdown_report__dbr import execute as dbr_execute
except Exception:
    # Fallback import path variants (if your folder uses spaces or different naming)
    from mxg_fleet_track.report.daily_breakdown_report_(dbr).daily_breakdown_report_(dbr) import execute as dbr_execute  # type: ignore

# ── THEME ────────────────────────────────────────────────────────────────────
BG        = (255, 255, 255)
TEXT      = (17, 24, 39)      # slate-900
MUTED     = (100, 116, 139)   # slate-500
BORDER    = (203, 213, 225)   # slate-300
HEADER_BG = (241, 245, 249)   # slate-100
ZEBRA     = (250, 250, 250)

TITLE_FT  = 32
META_FT   = 18
HEAD_FT   = 20
CELL_FT   = 18
BADGE_FT  = 20

PAGE_W          = 1800       # final image width in px
SIDE_MARGIN     = 40
TOP_MARGIN      = 40
BOTTOM_MARGIN   = 40
ROW_PAD_Y       = 10
CELL_PAD_X      = 14
COL_MIN_W       = 90
COL_MAX_W       = 420        # cap very long columns to avoid overflow
MAX_ROW_HEIGHT  = 260        # safety cap for tall wrapped rows

# ── FONTS ────────────────────────────────────────────────────────────────────
def _font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()

FONT_TITLE = _font(TITLE_FT)
FONT_META  = _font(META_FT)
FONT_HEAD  = _font(HEAD_FT)
FONT_CELL  = _font(CELL_FT)
FONT_BADGE = _font(BADGE_FT)

# ── TEXT UTILS ───────────────────────────────────────────────────────────────
def _text_width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    return math.ceil(draw.textlength(text or "", font=font))

def _wrap_to_width(draw, text: str, font, max_w: int) -> List[str]:
    text = (text or "").strip()
    if not text:
        return [""]
    words, lines, cur = text.split(), [], ""
    for w in words:
        candidate = (cur + " " + w).strip()
        if not cur or _text_width(draw, candidate, font) <= max_w:
            cur = candidate
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def _fmt(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        # keep integers tight, floats as-is (report usually casts)
        if isinstance(val, float) and not val.is_integer():
            return f"{val}"
        return f"{int(val):,}"
    return str(val)

# ── TABLE MEASUREMENT ────────────────────────────────────────────────────────
def _measure_columns(draw, columns: List[Dict[str, Any]], data: List[Dict[str, Any]]) -> List[int]:
    """Compute per-column width from header + sample values, capped to COL_MAX_W.
       Scales down if total exceeds available width."""
    widths = []
    for col in columns:
        fieldname = col.get("fieldname") or col.get("id") or ""
        header    = col.get("label") or fieldname or ""
        max_w = _text_width(draw, header, FONT_HEAD) + CELL_PAD_X * 2
        for row in data[:80]:  # sample a bit more for mixed content
            v = _fmt(row.get(fieldname))
            max_w = max(max_w, _text_width(draw, v, FONT_CELL) + CELL_PAD_X * 2)
        widths.append(min(max(COL_MIN_W, max_w), COL_MAX_W))

    total = sum(widths)
    usable = PAGE_W - SIDE_MARGIN * 2
    if total > usable:
        scale = usable / total
        widths = [max(COL_MIN_W, int(w * scale)) for w in widths]
    return widths

# ── DRAW CORE ────────────────────────────────────────────────────────────────
def _draw_ft_dbr(columns, data, filters) -> Image.Image:
    # estimate height; crop later
    est_h = max(1400, 500 + (len(data) + 3) * (CELL_FT + ROW_PAD_Y * 2))
    img   = Image.new("RGB", (PAGE_W, est_h), BG)
    draw  = ImageDraw.Draw(img)

    x = SIDE_MARGIN
    y = TOP_MARGIN

    # Title
    title = "Fleetrack — Daily Breakdown Report"
    draw.text((x, y), title, font=FONT_TITLE, fill=TEXT)
    y += FONT_TITLE + 8

    # Efficiency badge (if present on first row)
    eff_text = None
    if data and isinstance(data[0], dict) and "efficiency" in data[0]:
        eff_val = data[0].get("efficiency")
        if eff_val not in (None, ""):
            eff_text = f"Efficiency: {eff_val}"
    # Meta line
    today = datetime.date.today().strftime("%Y-%m-%d")
    meta_l = f"Generated: {today}"
    meta_r_bits = []
    if filters.get("region"):
        meta_r_bits.append(f"region: {filters['region']}")
    if filters.get("from_date"):
        meta_r_bits.append(f"from: {filters['from_date']}")
    if filters.get("to_date"):
        meta_r_bits.append(f"to: {filters['to_date']}")
    meta_r = " | ".join(meta_r_bits)

    draw.text((x, y), meta_l, font=FONT_META, fill=MUTED)
    if meta_r:
        w = _text_width(draw, meta_r, FONT_META)
        draw.text((PAGE_W - SIDE_MARGIN - w, y), meta_r, font=FONT_META, fill=MUTED)
    y += FONT_META + 10

    if eff_text:
        # simple rounded badge
        pad_x, pad_y = 10, 6
        tw = _text_width(draw, eff_text, FONT_BADGE)
        bh = BADGE_FT + pad_y * 2
        bw = tw + pad_x * 2
        bx1, by1 = x, y
        bx2, by2 = x + bw, y + bh
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=10, fill=(232, 247, 233), outline=(16, 185, 129))
        draw.text((bx1 + pad_x, by1 + pad_y), eff_text, font=FONT_BADGE, fill=(16, 122, 87))
        y += bh + 10

    # Measure columns (use whatever the report returns)
    col_widths = _measure_columns(draw, columns, data)

    # Header row
    header_h = HEAD_FT + ROW_PAD_Y * 2
    draw.rounded_rectangle([x, y, PAGE_W - SIDE_MARGIN, y + header_h], radius=6, fill=HEADER_BG, outline=BORDER)
    cx = x
    for i, col in enumerate(columns):
        label = (col.get("label") or col.get("fieldname") or "").strip() or "-"
        tx = cx + CELL_PAD_X
        ty = y + ROW_PAD_Y
        draw.text((tx, ty), label, font=FONT_HEAD, fill=TEXT)
        if i < len(columns) - 1:
            draw.line([(cx + col_widths[i], y), (cx + col_widths[i], y + header_h)], fill=BORDER, width=1)
        cx += col_widths[i]
    y += header_h
    draw.line([(x, y), (PAGE_W - SIDE_MARGIN, y)], fill=BORDER, width=1)

    # Data rows
    zebra = False
    for row in data:
        zebra = not zebra
        cx = x

        # Wrap and measure row height
        wrapped_cols: List[List[str]] = []
        max_lines = 1
        for i, col in enumerate(columns):
            fieldname = col.get("fieldname") or ""
            v = _fmt(row.get(fieldname))
            lines = _wrap_to_width(draw, v, FONT_CELL, col_widths[i] - CELL_PAD_X * 2)
            wrapped_cols.append(lines)
            max_lines = max(max_lines, len(lines))
        row_h = min(MAX_ROW_HEIGHT, max_lines * (CELL_FT + 4) + ROW_PAD_Y * 2)

        # zebra bg
        if zebra:
            draw.rectangle([x, y, PAGE_W - SIDE_MARGIN, y + row_h], fill=ZEBRA)

        # cells
        for i, lines in enumerate(wrapped_cols):
            tx = cx + CELL_PAD_X
            ty = y + ROW_PAD_Y
            # draw visible lines within cap
            max_draw_lines = max(1, (MAX_ROW_HEIGHT - ROW_PAD_Y * 2) // (CELL_FT + 4))
            for ln in lines[:max_draw_lines]:
                draw.text((tx, ty), ln, font=FONT_CELL, fill=TEXT)
                ty += CELL_FT + 4

            if i < len(columns) - 1:
                draw.line([(cx + col_widths[i], y), (cx + col_widths[i], y + row_h)], fill=BORDER, width=1)
            cx += col_widths[i]

        # bottom border
        draw.line([(x, y + row_h), (PAGE_W - SIDE_MARGIN, y + row_h)], fill=BORDER, width=1)
        y += row_h

    # Footer
    y += 10
    footer = "Sent via Fleetrack • PIL render"
    draw.text((x, y), footer, font=FONT_META, fill=MUTED)
    y += FONT_META + BOTTOM_MARGIN

    # crop canvas to content
    return img.crop((0, 0, PAGE_W, min(y, est_h)))

# ── WHAPI SEND ────────────────────────────────────────────────────────────────
def _send_whapi_image(png_buf: io.BytesIO, to: str, caption: str = "Fleetrack — Daily Breakdown Report") -> Dict[str, Any]:
    if not WHAPI_BASE or not WHAPI_TOKEN:
        frappe.throw("Whapi credentials not configured. Add 'whapi_base' and 'whapi_token' in site_config.json.")
    url = f"{WHAPI_BASE}/messages/image"
    headers = {"Authorization": f"Bearer {WHAPI_TOKEN}"}
    files = {"image": ("fleetrack_dbr.png", png_buf, "image/png")}
    data  = {"to": to, "caption": caption}
    r = requests.post(url, headers=headers, data=data, files=files, timeout=60)
    r.raise_for_status()
    return r.json()

# ── PUBLIC API ────────────────────────────────────────────────────────────────
@frappe.whitelist()
def send_ft_dbr_pil_image(to: str, **filters) -> Dict[str, Any]:
    """
    Render the Fleetrack DBR with PIL and send to WhatsApp via Whapi as an image.

    Args:
        to: WhatsApp JID (e.g., '26377xxxxxxx' for individual or '1234567890@g.us' for group)
        **filters: same filters your DBR 'execute' expects — typically requires region=<FT Region>
    """
    if not to:
        frappe.throw("Missing 'to' (WhatsApp JID).")

    # Region is typically mandatory on this report; enforce if your report requires it.
    if not filters.get("region"):
        # If your report truly does NOT require region, feel free to remove this guard.
        frappe.throw("Missing required filter: region")

    # 1) Fetch data from the report
    columns, data = dbr_execute(filters or {})

    # 2) Draw image with PIL
    img = _draw_ft_dbr(columns, data, filters or {})

    # 3) Encode PNG
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    # 4) Send via Whapi
    whapi_resp = _send_whapi_image(buf, to=to, caption="Fleetrack — Daily Breakdown Report")
    return {"ok": True, "whapi_response": whapi_resp}
