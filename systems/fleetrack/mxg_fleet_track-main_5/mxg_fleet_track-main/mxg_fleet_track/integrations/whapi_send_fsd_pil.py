# -*- coding: utf-8 -*-
"""
Fleetrack — FSD/DBR WhatsApp Image (PIL only) — NO OVERLAP VERSION
- Smart wrapping (breaks long tokens with no spaces; hyphen/slash aware)
- Auto-fit columns with min widths; grows canvas up to MAX_W
- Two-pass row height incl. sub-lines; right-align numeric cols
"""

from __future__ import annotations
import io, math, datetime
from typing import Any, Dict, List, Tuple

import requests
import frappe
from frappe.desk.query_report import run as run_report
from PIL import Image, ImageDraw, ImageFont

# ── WHAPI ────────────────────────────────────────────────────────────────────
WHAPI_BASE  = "https://gate.whapi.cloud"
WHAPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"   # <— replace if needed

def _logo_url() -> str:
    try:
        return frappe.utils.get_url("/files/fleetrack-logo.png")
    except Exception:
        return ""

REPORT_CANDIDATES = [
    "FSD Daily Breakdown Report",
    "Daily Breakdown Report (DBR)",
    "FSD Daily Breakdown",
    "fsd_daily_breakdown_report",
    "daily_breakdown_report_(dbr)",
]

# Hide fields (case-insensitive)
HIDE_EXACT    = {"region"}
HIDE_CONTAINS = {"on_hold"}

# Theme & layout
WHITE = (255, 255, 255)
TEXT  = (24, 28, 35)
MUTED = (110, 120, 133)
BORDER= (215, 220, 227)
RED   = (225, 29, 45)

TITLE_FT, META_FT, HEAD_FT, CELL_FT, SMALL_FT = 30, 18, 18, 18, 14

# Wider base/max so tight tables have room before shrinking
BASE_W, MAX_W = 2200, 3600
SIDE, TOP, BOTTOM = 44, 36, 36
PAD_Y, PAD_X, LINE_SP = 12, 20, 7

COL_MIN, COL_MAX = 100, 680

RIGHT_ALIGN = {"days_on_bd"}

# ── Fonts ────────────────────────────────────────────────────────────────────
def _font(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

FONT_TITLE = _font(TITLE_FT)
FONT_META  = _font(META_FT)
FONT_HEAD  = _font(HEAD_FT)
FONT_CELL  = _font(CELL_FT)
FONT_SMALL = _font(SMALL_FT)

# ── Text helpers ─────────────────────────────────────────────────────────────
WRAP_SEPARATORS = "-/_•.•#."

def _w(draw: ImageDraw.ImageDraw, s: str, f) -> int:
    return math.ceil(draw.textlength(s or "", font=f))

def _force_break_token(draw, token: str, f, max_w: int) -> List[str]:
    """Break a single long token into chunks that each fit max_w."""
    if not token:
        return [""]
    pieces, cur = [], ""
    for ch in token:
        cand = cur + ch
        if _w(draw, cand, f) <= max_w or not cur:
            cur = cand
        else:
            pieces.append(cur)
            cur = ch
    if cur:
        pieces.append(cur)
    return pieces

def _split_on_separators(token: str) -> List[str]:
    parts, cur = [], ""
    for ch in token:
        if ch in WRAP_SEPARATORS:
            if cur:
                parts.append(cur)
                cur = ""
            parts.append(ch)  # keep the separator as its own "word" so it can wrap
        else:
            cur += ch
    if cur:
        parts.append(cur)
    return parts

def _wrap_smart(draw, s: str, f, max_w: int) -> List[str]:
    """Wrap text to max_w. Breaks on spaces; also breaks inside long tokens."""
    s = (s or "").strip()
    if not s:
        return [""]
    words = []
    for raw in s.split():
        # split on separators first, so we can wrap after hyphens/slashes/etc.
        words += _split_on_separators(raw)
    lines, cur = [], ""
    for w in words:
        # try to append the next piece naturally
        sep = "" if (cur == "" or w in WRAP_SEPARATORS) else " "
        cand = (cur + sep + w).strip()
        if _w(draw, cand, f) <= max_w:
            cur = cand
            continue
        # if single piece is too wide, force-break it into fit chunks
        if _w(draw, w, f) > max_w and w not in WRAP_SEPARATORS:
            # flush current line if it has content
            if cur:
                lines.append(cur)
                cur = ""
            for chunk in _force_break_token(draw, w, f, max_w):
                if _w(draw, chunk, f) <= max_w:
                    if cur:
                        lines.append(cur); cur = ""
                    lines.append(chunk)
                else:
                    # extremely rare: still too big (non-measurable), just append
                    lines.append(chunk)
            continue
        # otherwise start a new line
        if cur:
            lines.append(cur)
        cur = w if w in WRAP_SEPARATORS else w
    if cur:
        lines.append(cur)
    return lines

def _fmt(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (int, float)):
        return f"{v}" if isinstance(v, float) and not v.is_integer() else f"{int(v):,}"
    return str(v)

# ── Report runner & normalization ────────────────────────────────────────────
def _to_snake(s: str) -> str:
    return (s or "").strip().lower().replace(" ", "_")

def _should_hide(fieldname: str) -> bool:
    fn = (fieldname or "").lower()
    if fn in HIDE_EXACT:
        return True
    return any(tok in fn for tok in HIDE_CONTAINS)

HEADER_MAP = {
    "customer": "Customer",
    "machine": "Machine",
    "model": "Model",
    "sn": "Sn",
    "hmr": "HMR",
    "reported": "Reported",
    "date": "Date",
    "description": "Description",
    "status": "Status",
    "resp": "Resp",
    "days_on_bd": "Days on BD",
    "parts_eta": "ETA",
    "outwork_eta": "Outwork ETA",
    "warranty_status": "Warranty Status",
    "ted_status": "Ted Status",
    "ted": "TED",
    "red": "RED",
    "manager_comments": "Manager's Comments",
    "efficiency": "% Efficiency",
}

def _run_report_normalized(filters: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    last = None
    for name in REPORT_CANDIDATES:
        try:
            out = run_report(name, filters=filters)
            cols = out.get("columns") or []
            rows = out.get("result") or []

            norm_cols = []
            for c in cols:
                if isinstance(c, dict):
                    fn = c.get("fieldname") or _to_snake(c.get("label") or "")
                    if _should_hide(fn): continue
                    c["fieldname"] = fn
                    c["label"] = HEADER_MAP.get(fn, (c.get("label") or fn))
                    norm_cols.append(c)
                else:
                    fn = _to_snake(str(c))
                    if _should_hide(fn): continue
                    norm_cols.append({"label": HEADER_MAP.get(fn, str(c)), "fieldname": fn})

            norm_rows = []
            for r in rows:
                nr = {}
                for k, v in (r or {}).items():
                    nk = _to_snake(k)
                    if _should_hide(nk): continue
                    nr[nk] = v
                norm_rows.append(nr)

            return norm_cols, norm_rows
        except Exception as e:
            last = e
    frappe.throw(f"Could not run report by any of: {REPORT_CANDIDATES}\nLast error: {last}")

# ── Logo ─────────────────────────────────────────────────────────────────────
def _load_logo() -> Image.Image | None:
    url = _logo_url()
    if not url:
        return None
    try:
        if url.startswith("http"):
            r = requests.get(url, timeout=8); r.raise_for_status()
            im = Image.open(io.BytesIO(r.content)).convert("RGBA")
        else:
            im = Image.open(url).convert("RGBA")
        h = 40; w = int(im.width * (h / im.height))
        return im.resize((w, h), Image.LANCZOS)
    except Exception:
        return None

# ── Column auto-fit + dynamic width ──────────────────────────────────────────
def _fit_columns(draw, columns, data, base_w: int) -> Tuple[int, List[int]]:
    MINW = {
        "customer": 220, "machine": 270, "model": 150, "sn": 150, "hmr": 110,
        "reported": 130, "date": 130, "description": 360, "status": 360,
        "resp": 100, "days_on_bd": 120, "parts_eta": 140, "outwork_eta": 140,
        "warranty_status": 170, "ted_status": 120, "ted": 100, "red": 90,
        "manager_comments": 280,
    }
    SHRINK = {
        "description": 1.0, "status": 1.0, "manager_comments": 0.9,
        "customer": 0.8, "machine": 0.7, "reported": 0.6, "date": 0.6,
        "parts_eta": 0.5, "outwork_eta": 0.5, "warranty_status": 0.5,
        "model": 0.4, "sn": 0.5, "hmr": 0.4, "resp": 0.4, "ted_status": 0.4,
        "ted": 0.4, "red": 0.4, "days_on_bd": 0.4, "customer_ref": 0.4,
        "fleet_no": 0.4, "location": 0.4,
    }

    naturals, fns = [], []
    for col in columns:
        fn = (col.get("fieldname") or col.get("id") or "").lower()
        fns.append(fn)
        header = (col.get("label") or fn or "")
        nat = _w(draw, header, FONT_HEAD) + PAD_X * 2
        for r in data[:120]:
            v = _fmt(r.get(fn))
            # measure longest possible wrapped piece by simulating break
            test_lines = _wrap_smart(draw, v, FONT_CELL, COL_MAX)
            nat = max(nat, max((_w(draw, t, FONT_CELL) for t in test_lines), default=0) + PAD_X * 2)
        naturals.append(min(max(nat, COL_MIN), COL_MAX))

    widths = [max(n, MINW.get(fn, COL_MIN)) for n, fn in zip(naturals, fns)]
    usable = base_w - SIDE * 2
    total  = sum(widths)
    if total <= usable:
        return base_w, widths

    # shrink with weights
    excess = total - usable
    caps, tot = [], 0.0
    for w, fn in zip(widths, fns):
        minw = MINW.get(fn, COL_MIN); room = max(0, w - minw)
        cap  = room * SHRINK.get(fn, 0.6)
        caps.append((minw, cap, fn)); tot += cap
    if tot > 0:
        neww = []
        for w, (minw, cap, fn) in zip(widths, caps):
            share = excess * (cap / tot) if cap > 0 else 0
            neww.append(max(minw, int(round(w - share))))
        widths = neww
        if sum(widths) <= usable:
            return base_w, widths

    # grow canvas to the right
    min_total = sum(max(MINW.get(fn, COL_MIN), COL_MIN) for fn in fns)
    need_w = min(MAX_W, max(base_w, min_total + SIDE * 2))
    return need_w, [max(w, MINW.get(fn, COL_MIN)) for w, fn in zip(widths, fns)]

# ── Height helpers ───────────────────────────────────────────────────────────
def _measure_header_h(draw, columns, widths) -> int:
    lines = []
    for i, col in enumerate(columns):
        lab = (col.get("label") or col.get("fieldname") or "-").strip()
        lines.append(_wrap_smart(draw, lab, FONT_HEAD, widths[i] - PAD_X * 2))
    return PAD_Y * 2 + max((len(x) for x in lines), default=1) * (HEAD_FT + LINE_SP)

def _compute_height(draw, columns, data, widths, page_w) -> int:
    y = TOP
    y += 48                       # logo/title row
    y += 44                       # Prepared by/Date row + spacing
    y += _measure_header_h(draw, columns, widths) + 1
    for r in data:
        # quick pass assuming worst-case of a couple lines; final pass recalculates
        y += (PAD_Y * 2 + 2 * (CELL_FT + LINE_SP) + 10) + 1
    y += 12 + META_FT + BOTTOM
    return y

# ── Draw (two-pass, with Customer/Machine subs) ─────────────────────────────
def _draw_fsd_dbr(columns, data, filters) -> Image.Image:
    probe = Image.new("RGB", (BASE_W, 200), WHITE)
    pd    = ImageDraw.Draw(probe)

    page_w, widths = _fit_columns(pd, columns, data, BASE_W)
    total_h = _compute_height(pd, columns, data, widths, page_w)

    img = Image.new("RGB", (page_w, total_h), WHITE)
    d   = ImageDraw.Draw(img)

    x, y = SIDE, TOP

    # Top bar: logo + title
    logo = _load_logo()
    if logo: img.paste(logo, (x, y), logo)
    region = filters.get("region") or filters.get("Region") or ""
    title  = f"Daily Breakdown Report (DBR){' – ' + region if region else ''}"
    t_w    = _w(d, title, FONT_TITLE)
    d.text((page_w - SIDE - t_w, y + 4), title, font=FONT_TITLE, fill=TEXT)

    y += 48
    d.line([(SIDE, y), (page_w - SIDE, y)], fill=BORDER, width=2)

    # Prepared by / Date
    y += 14
    d.text((SIDE, y), "Prepared\nby", font=FONT_SMALL, fill=MUTED)
    prepared_by = filters.get("prepared_by") or getattr(getattr(frappe, "session", None), "user_fullname", "") or "-"
    d.text((SIDE + 96, y), prepared_by, font=FONT_CELL, fill=TEXT)
    d.text((SIDE, y + 34), "Date", font=FONT_SMALL, fill=MUTED)
    d.text((SIDE + 96, y + 34), datetime.date.today().strftime("%d/%m/%Y"), font=FONT_CELL, fill=TEXT)
    y += 60

    # Header band (red)
    head_h = _measure_header_h(d, columns, widths)
    d.rounded_rectangle([SIDE, y, page_w - SIDE, y + head_h], radius=6, fill=RED)
    cx = SIDE
    for i, col in enumerate(columns):
        lab = (col.get("label") or col.get("fieldname") or "-").strip()
        lines = _wrap_smart(d, lab, FONT_HEAD, widths[i] - PAD_X * 2)
        tx, ty = cx + PAD_X, y + PAD_Y
        for ln in lines:
            d.text((tx, ty), ln, font=FONT_HEAD, fill=WHITE)
            ty += HEAD_FT + LINE_SP
        cx += widths[i]
    y += head_h
    d.line([(SIDE, y), (page_w - SIDE, y)], fill=BORDER, width=1)

    # Rows
    zebra = False
    for r in data:
        zebra = not zebra
        cx = SIDE

        # Extract subs
        cust_ref = _fmt(r.get("customer_ref") or r.get("ref"))
        location = _fmt(r.get("location") or r.get("site") or r.get("address"))
        sn       = _fmt(r.get("sn") or r.get("srn"))
        fleet_no = _fmt(r.get("fleet_no") or r.get("fleet") or r.get("fleet_number"))
        hmr      = _fmt(r.get("hmr") or r.get("current_hmr"))
        warr     = _fmt(r.get("warranty_status") or r.get("warranty"))

        # Build wraps per column (with sub-lines for customer & machine)
        wrapped: List[Tuple[str, List[str], List[str]]] = []
        max_lines_main = 1
        max_subs = 0

        for i, col in enumerate(columns):
            fn  = (col.get("fieldname") or "").lower()
            raw = _fmt(r.get(fn))

            if fn == "customer":
                main = _wrap_smart(d, raw, FONT_CELL, widths[i] - PAD_X * 2)
                subs = []
                if cust_ref: subs.append(f"Ref ▸ {cust_ref}")
                if location: subs.append(f"• {location}")
                wsubs = []
                for s in subs:
                    wsubs += _wrap_smart(d, s, FONT_SMALL, widths[i] - PAD_X * 2)
                wrapped.append((fn, main, wsubs))
                max_lines_main = max(max_lines_main, len(main))
                max_subs = max(max_subs, len(wsubs))

            elif fn == "machine":
                main = _wrap_smart(d, raw, FONT_CELL, widths[i] - PAD_X * 2)
                subs = []
                if sn:       subs.append(f"SRN ▸ {sn}")
                if fleet_no: subs.append(f"Fleet No ▸ {fleet_no}")
                if hmr:      subs.append(f"Current HMR ▸ {hmr}")
                if warr:     subs.append(f"{warr}")
                wsubs = []
                for s in subs:
                    wsubs += _wrap_smart(d, s, FONT_SMALL, widths[i] - PAD_X * 2)
                wrapped.append((fn, main, wsubs))
                max_lines_main = max(max_lines_main, len(main))
                max_subs = max(max_subs, len(wsubs))

            else:
                main = _wrap_smart(d, raw, FONT_CELL, widths[i] - PAD_X * 2)
                wrapped.append((fn, main, []))
                max_lines_main = max(max_lines_main, len(main))

        # compute row height precisely (accounting for sub-lines)
        row_h_main = PAD_Y * 2 + max_lines_main * (CELL_FT + LINE_SP)
        row_h_subs = 0
        if max_subs > 0:
            row_h_subs = 6 + max_subs * (SMALL_FT + LINE_SP - 1)
        row_h = max(row_h_main, PAD_Y * 2 + (CELL_FT + LINE_SP) + row_h_subs)

        if zebra:
            d.rectangle([SIDE, y, page_w - SIDE, y + row_h], fill=(250, 250, 250))

        # draw cells
        for i, (fn, main, subs) in enumerate(wrapped):
            tx, ty = cx + PAD_X, y + PAD_Y

            if fn in RIGHT_ALIGN:
                for ln in main:
                    tw = _w(d, ln, FONT_CELL)
                    d.text((cx + widths[i] - PAD_X - tw, ty), ln, font=FONT_CELL, fill=TEXT)
                    ty += CELL_FT + LINE_SP
            else:
                for ln in main:
                    d.text((tx, ty), ln, font=FONT_CELL, fill=TEXT)
                    ty += CELL_FT + LINE_SP
                if subs:
                    ty += 6
                    for ln in subs:
                        d.text((tx, ty), ln, font=FONT_SMALL, fill=MUTED)
                        ty += SMALL_FT + LINE_SP - 1

            if i < len(columns) - 1:
                d.line([(cx + widths[i], y), (cx + widths[i], y + row_h)], fill=BORDER, width=1)
            cx += widths[i]

        d.line([(SIDE, y + row_h), (page_w - SIDE, y + row_h)], fill=BORDER, width=1)
        y += row_h

    # Footer
    y += 12
    d.text((SIDE, y), "Sent via Fleetrack • PIL render", font=FONT_META, fill=MUTED)
    return img

# ── Whapi send ───────────────────────────────────────────────────────────────
def _send_whapi(png_buf: io.BytesIO, to: str, caption: str) -> Dict[str, Any]:
    if not WHAPI_BASE or not WHAPI_TOKEN:
        frappe.throw("Whapi credentials missing. Set WHAPI_BASE/WHAPI_TOKEN.")
    url = f"{WHAPI_BASE}/messages/image"
    headers = {"Authorization": f"Bearer {WHAPI_TOKEN}"}
    files = {"media": ("fleetrack_dbr.png", png_buf, "image/png")}
    data  = {"to": to, "caption": caption}
    r = requests.post(url, headers=headers, data=data, files=files, timeout=60)
    r.raise_for_status()
    return r.json()

# ── Public API ───────────────────────────────────────────────────────────────
@frappe.whitelist()
def send_fsd_dbr_pil_image(to: str, **filters) -> Dict[str, Any]:
    """
    Render the FSD/DBR as an image and send to WhatsApp via Whapi.
    Args:
      to: WhatsApp JID ('26377xxxxxxx' or '123456789@g.us')
      filters: pass your report filters (e.g., region='South')
    """
    if not to:
        frappe.throw("Missing 'to' (WhatsApp JID).")
    columns, data = _run_report_normalized(filters or {})
    img = _draw_fsd_dbr(columns, data, filters or {})
    buf = io.BytesIO(); img.save(buf, format="PNG", optimize=True); buf.seek(0)
    resp = _send_whapi(buf, to, caption="Daily Breakdown Report (DBR)")
    return {"ok": True, "whapi_response": resp}
