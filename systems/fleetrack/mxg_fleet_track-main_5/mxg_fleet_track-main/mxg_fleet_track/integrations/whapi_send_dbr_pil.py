# -*- coding: utf-8 -*-
"""
Fleetrack — Daily Breakdown Report → WhatsApp Image (PIL only)

Fixes:
- Wrapped headers (no overlap) with header height auto-sizing
- Header aliases: 'Days', 'ETA', 'Warranty', 'TED Status'
- Hide: efficiency, region, and ANY field containing 'on_hold'
- Right-align numeric columns
- Dynamic width grow-to-right + two-pass exact height (no cutting)

Call:
https://fleetrack.machinery-exchange.com/api/method/mxg_fleet_track.integrations.whapi_send_dbr_pil.send_ft_dbr_pil_image?to=123456789@g.us&region=South
"""
from __future__ import annotations

import io, math, datetime
from typing import Any, Dict, List, Tuple

import requests
import frappe
from frappe.desk.query_report import run as run_report
from PIL import Image, ImageDraw, ImageFont

# ── WHAPI CONFIG (inline for simplicity) ─────────────────────────────────────
WHAPI_BASE  = "https://gate.whapi.cloud"            # change if different
WHAPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"       # paste your bearer token

# ── REPORT NAME(S) ───────────────────────────────────────────────────────────
REPORT_CANDIDATES = [
    "Daily Breakdown Report (DBR)",
    "Daily Breakdown Report",
    "daily_breakdown_report_(dbr)",
]

# ── HIDE & HEADER ALIASES ───────────────────────────────────────────────────
# Hide by exact fieldname OR if fieldname contains any token below
HIDE_EXACT   = {"efficiency", "region"}
HIDE_CONTAINS = {"on_hold"}  # catches on_hold, on_hold_qty, etc.

# Friendly (shorter) header labels by fieldname
HEADER_ALIASES = {
    "days_on_bd": "Days",
    "parts_eta": "ETA",
    "warranty_status": "Warranty",
    "ted_status": "TED Status",
}

# ── THEME / LAYOUT ───────────────────────────────────────────────────────────
BG        = (255, 255, 255)
TEXT      = (17, 24, 39)
MUTED     = (100, 116, 139)
BORDER    = (203, 213, 225)
HEADER_BG = (241, 245, 249)
ZEBRA     = (250, 250, 250)

TITLE_FT  = 32
META_FT   = 18
HEAD_FT   = 20
CELL_FT   = 18

BASE_PAGE_W = 1900
MAX_PAGE_W  = 3400

SIDE_MARGIN   = 40
TOP_MARGIN    = 40
BOTTOM_MARGIN = 40

ROW_PAD_Y     = 12
CELL_PAD_X    = 18
LINE_SPACING  = 6

COL_MIN_W     = 90
COL_MAX_W     = 600

# Right-align these fields (numbers usually)
ALIGN_RIGHT = {"hmr", "days_on_bd"}

# ── FONTS ────────────────────────────────────────────────────────────────────
def _font(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()

FONT_TITLE = _font(TITLE_FT)
FONT_META  = _font(META_FT)
FONT_HEAD  = _font(HEAD_FT)
FONT_CELL  = _font(CELL_FT)

# ── TEXT HELPERS ─────────────────────────────────────────────────────────────
def _text_width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    return math.ceil(draw.textlength(text or "", font=font))

def _wrap_to_width(draw, text: str, font, max_w: int) -> List[str]:
    text = (text or "").strip()
    if not text:
        return [""]
    words, lines, cur = text.split(), [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if not cur or _text_width(draw, cand, font) <= max_w:
            cur = cand
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def _fmt(val: Any) -> str:
    if val is None: return ""
    if isinstance(val, (int, float)):
        return f"{val}" if isinstance(val, float) and not val.is_integer() else f"{int(val):,}"
    return str(val)

# ── REPORT RUNNER (by name) ──────────────────────────────────────────────────
def _should_hide(fieldname: str) -> bool:
    fn = (fieldname or "").lower()
    if fn in HIDE_EXACT:
        return True
    return any(tok in fn for tok in HIDE_CONTAINS)

def _run_dbr(filters: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    last_error = None
    for name in REPORT_CANDIDATES:
        try:
            out = run_report(name, filters=filters)
            cols = out.get("columns") or []
            rows = out.get("result") or []

            # normalize columns
            norm_cols = []
            for c in cols:
                if isinstance(c, dict):
                    if not c.get("fieldname"):
                        c["fieldname"] = (c.get("label") or "").strip().lower().replace(" ", "_")
                    field = (c.get("fieldname") or "").lower()
                    if _should_hide(field):
                        continue
                    # apply header alias
                    label = (c.get("label") or "").strip() or field
                    alias = HEADER_ALIASES.get(field)
                    c["label"] = alias or label
                    norm_cols.append(c)
                else:
                    field = str(c).strip().lower().replace(" ", "_")
                    if _should_hide(field):
                        continue
                    norm_cols.append({"label": HEADER_ALIASES.get(field, str(c)), "fieldname": field})

            # strip hidden keys from rows
            for r in rows:
                for k in list(r.keys()):
                    if _should_hide(k):
                        r.pop(k, None)

            return (norm_cols, rows)
        except Exception as e:
            last_error = e
            continue
    frappe.throw(f"Could not run DBR by any of: {REPORT_CANDIDATES}\nLast error: {last_error}")

# ── COLUMN AUTO-FIT + DYNAMIC WIDTH (prioritize Model/SN/ETA) ───────────────
def _fit_columns_and_page_width(draw, columns, data, base_page_w: int) -> Tuple[int, List[int]]:
    MIN_W = {
        "customer": 170,
        "model": 230,        # priority
        "sn": 230,           # priority
        "hmr": 100,
        "date": 150,
        "description": 300,
        "status": 320,
        "days_on_bd": 120,
        "parts_eta": 220,    # priority
        "warranty_status": 170,
        "ted_status": 130,
        "ted": 130,
        "red": 80,
    }
    SHRINK_WEIGHT = {
        "description": 1.0, "status": 1.0, "customer": 0.9,
        "warranty_status": 0.8,
        "date": 0.6, "hmr": 0.6, "days_on_bd": 0.6,
        "ted_status": 0.6, "ted": 0.6, "red": 0.4,
        # strongly protect:
        "model": 0.25, "sn": 0.25, "parts_eta": 0.25,
    }

    naturals, fns = [], []
    for col in columns:
        fn = (col.get("fieldname") or col.get("id") or "").lower()
        fns.append(fn)
        header = (col.get("label") or fn or "")
        nat = _text_width(draw, header, FONT_HEAD) + CELL_PAD_X * 2
        for row in data[:80]:
            v = _fmt(row.get(fn))
            nat = max(nat, _text_width(draw, v, FONT_CELL) + CELL_PAD_X * 2)
        naturals.append(min(max(nat, COL_MIN_W), COL_MAX_W))

    widths = [max(n, MIN_W.get(fn, COL_MIN_W)) for n, fn in zip(naturals, fns)]
    usable = base_page_w - SIDE_MARGIN * 2
    total  = sum(widths)
    if total <= usable:
        return base_page_w, widths

    # shrink by weighted room
    excess = total - usable
    caps, weighted_total = [], 0.0
    for w, fn in zip(widths, fns):
        min_w = MIN_W.get(fn, COL_MIN_W)
        room  = max(0, w - min_w)
        weight = SHRINK_WEIGHT.get(fn, 0.6)
        cap = room * weight
        caps.append((min_w, cap, fn))
        weighted_total += cap

    if weighted_total > 0:
        new_w = []
        for w, (min_w, cap, fn) in zip(widths, caps):
            share = excess * (cap / weighted_total) if cap > 0 else 0
            new_w.append(max(min_w, int(round(w - share))))
        widths = new_w
        if sum(widths) <= usable:
            return base_page_w, widths

    # grow to the right
    min_total = sum(MIN_W.get(fn, COL_MIN_W) for fn in fns)
    needed_page = min(MAX_PAGE_W, max(base_page_w, min_total + SIDE_MARGIN * 2))
    return needed_page, [max(w, MIN_W.get(fn, COL_MIN_W)) for w, fn in zip(widths, fns)]

# ── HEIGHT (pass 1) ─────────────────────────────────────────────────────────
def _compute_table_height(draw, columns, data, col_widths, page_w, filters) -> int:
    y = TOP_MARGIN
    y += TITLE_FT + 8
    y += META_FT + 10
    # header height from wrapped headers
    header_h = _measure_header_height(draw, columns, col_widths)
    y += header_h + 1
    for row in data:
        max_lines = 1
        for i, col in enumerate(columns):
            fn = col.get("fieldname") or ""
            v = _fmt(row.get(fn))
            lines = _wrap_to_width(draw, v, FONT_CELL, col_widths[i] - CELL_PAD_X * 2)
            max_lines = max(max_lines, len(lines))
        row_h = ROW_PAD_Y * 2 + max_lines * (CELL_FT + LINE_SPACING)
        y += row_h + 1
    y += 10 + META_FT + BOTTOM_MARGIN
    return y

def _measure_header_height(draw, columns, col_widths) -> int:
    """Wrap header labels and compute required header height."""
    max_lines = 1
    for i, col in enumerate(columns):
        label = (col.get("label") or col.get("fieldname") or "").strip() or "-"
        lines = _wrap_to_width(draw, label, FONT_HEAD, col_widths[i] - CELL_PAD_X * 2)
        max_lines = max(max_lines, len(lines))
    return ROW_PAD_Y * 2 + max_lines * (HEAD_FT + LINE_SPACING)

# ── DRAW (pass 2) ───────────────────────────────────────────────────────────
def _draw_ft_dbr(columns, data, filters) -> Image.Image:
    probe = Image.new("RGB", (BASE_PAGE_W, 200), BG)
    pd = ImageDraw.Draw(probe)

    page_w, col_widths = _fit_columns_and_page_width(pd, columns, data, BASE_PAGE_W)
    header_h = _measure_header_height(pd, columns, col_widths)
    total_h  = _compute_table_height(pd, columns, data, col_widths, page_w, filters)

    img = Image.new("RGB", (page_w, total_h), BG)
    draw = ImageDraw.Draw(img)

    x = SIDE_MARGIN
    y = TOP_MARGIN

    # Title
    draw.text((x, y), "Fleetrack — Daily Breakdown Report", font=FONT_TITLE, fill=TEXT)
    y += TITLE_FT + 8

    # Meta (left only to reduce clutter)
    today = datetime.date.today().strftime("%Y-%m-%d")
    draw.text((x, y), f"Generated: {today}", font=FONT_META, fill=MUTED)
    y += META_FT + 10

    # Header (wrapped)
    draw.rounded_rectangle([x, y, page_w - SIDE_MARGIN, y + header_h], radius=6, fill=HEADER_BG, outline=BORDER)
    cx = x
    for i, col in enumerate(columns):
        label = (col.get("label") or col.get("fieldname") or "").strip() or "-"
        hl = _wrap_to_width(draw, label, FONT_HEAD, col_widths[i] - CELL_PAD_X * 2)
        tx = cx + CELL_PAD_X
        ty = y + ROW_PAD_Y
        for ln in hl:
            draw.text((tx, ty), ln, font=FONT_HEAD, fill=TEXT)
            ty += HEAD_FT + LINE_SPACING
        if i < len(columns) - 1:
            draw.line([(cx + col_widths[i], y), (cx + col_widths[i], y + header_h)], fill=BORDER, width=1)
        cx += col_widths[i]
    y += header_h
    draw.line([(x, y), (page_w - SIDE_MARGIN, y)], fill=BORDER, width=1)

    # Rows
    zebra = False
    for row in data:
        zebra = not zebra
        cx = x
        wrapped, max_lines = [], 1
        for i, col in enumerate(columns):
            fn = col.get("fieldname") or ""
            v  = _fmt(row.get(fn))
            lines = _wrap_to_width(draw, v, FONT_CELL, col_widths[i] - CELL_PAD_X * 2)
            wrapped.append((fn, lines))
            max_lines = max(max_lines, len(lines))
        row_h = ROW_PAD_Y * 2 + max_lines * (CELL_FT + LINE_SPACING)

        if zebra:
            draw.rectangle([x, y, page_w - SIDE_MARGIN, y + row_h], fill=ZEBRA)

        for i, (fn, lines) in enumerate(wrapped):
            tx = cx + CELL_PAD_X
            ty = y + ROW_PAD_Y
            if fn in ALIGN_RIGHT:
                # draw each line right-aligned within the cell
                for ln in lines:
                    w = _text_width(draw, ln, FONT_CELL)
                    draw.text((cx + col_widths[i] - CELL_PAD_X - w, ty), ln, font=FONT_CELL, fill=TEXT)
                    ty += CELL_FT + LINE_SPACING
            else:
                for ln in lines:
                    draw.text((tx, ty), ln, font=FONT_CELL, fill=TEXT)
                    ty += CELL_FT + LINE_SPACING

            if i < len(columns) - 1:
                draw.line([(cx + col_widths[i], y), (cx + col_widths[i], y + row_h)], fill=BORDER, width=1)
            cx += col_widths[i]

        draw.line([(x, y + row_h), (page_w - SIDE_MARGIN, y + row_h)], fill=BORDER, width=1)
        y += row_h

    # Footer
    y += 10
    draw.text((x, y), "Sent via Fleetrack • PIL render", font=FONT_META, fill=MUTED)
    return img

# ── WHAPI SEND ───────────────────────────────────────────────────────────────
def _send_whapi_image(png_buf: io.BytesIO, to: str, caption: str = "Fleetrack — Daily Breakdown Report") -> Dict[str, Any]:
    if not WHAPI_BASE or not WHAPI_TOKEN:
        frappe.throw("Whapi credentials missing. Set WHAPI_BASE/WHAPI_TOKEN.")
    url = f"{WHAPI_BASE}/messages/image"
    headers = {"Authorization": f"Bearer {WHAPI_TOKEN}"}
    files = {"media": ("fleetrack_dbr.png", png_buf, "image/png")}
    data  = {"to": to, "caption": caption}
    r = requests.post(url, headers=headers, data=data, files=files, timeout=60)
    r.raise_for_status()
    return r.json()

# ── PUBLIC API ───────────────────────────────────────────────────────────────
@frappe.whitelist()
def send_ft_dbr_pil_image(to: str, **filters) -> Dict[str, Any]:
    if not to:
        frappe.throw("Missing 'to' (WhatsApp JID).")
    if not filters.get("region"):
        frappe.throw("Missing required filter: region")

    columns, data = _run_dbr(filters or {})
    img = _draw_ft_dbr(columns, data, filters or {})

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    resp = _send_whapi_image(buf, to=to)
    return {"ok": True, "whapi_response": resp}
