# -*- coding: utf-8 -*-
"""
Fleetrack → Omnis dashboard data for FT Breakdown Log

- Doctype: "FT Breakdown Log"
- Open breakdown  = end_date is empty / not set
- Urgent breakdown = urgent == 1 (uDBR)
- Map points by FT Location (with OpenAI-assisted geocoding as fallback)

Exposed methods:
    powerstar_salestrack.systems.fleetrack.ft_breakdown_dashboard.get_ft_breakdown_overview
    powerstar_salestrack.systems.fleetrack.ft_breakdown_dashboard.get_ft_breakdown_map_points
    powerstar_salestrack.systems.fleetrack.ft_breakdown_dashboard.update_ft_breakdown_status
"""

from __future__ import annotations

from typing import Dict, Any, List, Tuple, Optional, Union
import json

import frappe
from frappe.utils.password import check_password

# Import safe_requests from the main dashboard module
try:
    from powerstar_salestrack.omnis_dashboard import safe_requests
except ImportError:
    # Fallback if import fails (though it shouldn't in production)
    import requests
    def safe_requests(method, url, **kwargs):
        if 'timeout' not in kwargs:
            kwargs['timeout'] = (5, 25)
        return requests.request(method, url, **kwargs)


# OPTIONAL: only if you want OpenAI geocoding
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


@frappe.whitelist(allow_guest=True)
def login_and_get_keys(usr, pwd):
    """
    Authenticate user and return API Key + Secret.
    WARNING: This REGENERATES the API Secret for the user. 
    """
    try:
        login_manager = frappe.auth.LoginManager()
        login_manager.authenticate(user=usr, pwd=pwd)
        
        # If no exception, auth successful
        user = frappe.get_doc("User", usr)
        
        # Generate new keys manually (since generate_keys is missing)
        if not user.api_key:
            user.api_key = frappe.generate_hash(length=15)
            
        api_secret = frappe.generate_hash(length=15)
        user.api_secret = api_secret
        user.save(ignore_permissions=True)
        
        return {
            "api_key": user.api_key,
            "api_secret": api_secret,
            "user": user.name,
            "full_name": user.full_name
        }
    except frappe.AuthenticationError:
        return {"error": "Invalid login credentials"}
    except Exception as e:
        return {"error": str(e)}


# OpenAI helper (optional)
# ---------------------------------------------------------------------------



def _get_openai_client() -> Optional[OpenAI]:
    """Return an OpenAI client if API key is configured."""
    if OpenAI is None:
        return None

    # Fetch dynamic OAI key (fallback to previous hardcoded for backwards compatibility if not set)
    api_key = frappe.db.get_default("oai_secret") or "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"
    if not api_key:
        return None

    return OpenAI(api_key=api_key)

@frappe.whitelist()
def save_oai_secret(secret):
    """Securely save the OAI key locally as a default setting."""
    frappe.db.set_default("oai_secret", secret)
    return {"status": "success", "message": "OAI secret saved securely"}


def _geocode_location_with_openai(label: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Ask OpenAI for approximate lat/lon of a Zimbabwe location name.

    We keep it very constrained: ask for a tiny JSON payload only.
    """
    client = _get_openai_client()
    if not client:
        return None, None

    prompt = (
        "You are a geocoder for Zimbabwe only.\n"
        "Given a location name used by a company (for example 'Bulawayo HQ', "
        "'Harare Workshop', 'Hwange Mine'), return an approximate latitude and "
        "longitude that lies within Zimbabwe.\n\n"
        f"Location: {label!r}\n\n"
        "Respond ONLY with a JSON object like:\n"
        '{"lat": -17.8249, "lng": 31.0530}'
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "You return ONLY valid JSON."},
                {"role": "user", "content": prompt},
            ],
            timeout=20,
        )
        content = resp.choices[0].message.content.strip()
        data = json.loads(content)
        lat = float(data.get("lat"))
        lng = float(data.get("lng"))
        return lat, lng
    except Exception:
        frappe.log_error(
            title="FT Location OpenAI geocode failed",
            message=frappe.get_traceback(),
        )
        return None, None


# ---------------------------------------------------------------------------
# FT Location coord helper
# ---------------------------------------------------------------------------

# Common Zimbabwe town coordinates (lat, lng)
ZIM_COORDS = {
   # =========================
    # HARARE CORE & SUBURBS
    # =========================
    "HARARE CBD": (-17.82772, 31.05337),
    "AVONDALE": (-17.79611, 31.03472),
    "BELVEDERE": (-17.82750, 31.01200),
    "BLUFFHILL": (-17.77611, 30.98111),
    "BORROWDALE": (-17.75667, 31.10361),
    "BORROWDALE BROOKE": (-17.71361, 31.14500),
    "CHISIPITE": (-17.78861, 31.12278),
    "EASTLEA": (-17.82444, 31.07361),
    "EPWORTH": (-17.89000, 31.14750),
    "GLEN LORNE": (-17.74356, 31.16142),
    "GREENDALE": (-17.82099, 31.12028),
    "GRANGE": (-17.77333, 31.14056),
    "HIGHFIELD": (-17.88547, 30.99270),
    "HIGHLANDS": (-17.79480, 31.10850),
    "KAMBUZUMA": (-17.85444, 30.96722),
    "KUWADZANA": (-17.82733, 30.91315),
    "MABELREIGN": (-17.78670, 31.00380),
    "MEYRICK PARK": (-17.80166, 31.00261),
    "MILTON PARK": (-17.81472, 31.02472),
    "MOUNT PLEASANT": (-17.76371, 31.04765),
    "MSASA": (-17.84056, 31.11611),
    "NEWLANDS": (-17.80806, 31.08167),
    "POMONA": (-17.75417, 31.08639),
    "SOUTHERTON": (-17.86361, 31.01917),
    "VAINONA": (-17.75694, 31.07444),
    "WARREN PARK": (-17.83028, 30.98222),
    "WILLOWVALE": (-17.88056, 30.97444),
    "ARLINGTON": (-17.91310, 31.09470),

    # =========================
    # INDUSTRIAL / COMMERCIAL
    # =========================
    "MSASA, MARTIN DRIVE": (-17.84278, 31.11889),
    "MSASA, RAILWAY": (-17.84361, 31.11194),
    "ROBERT WAY, MSASA": (-17.83944, 31.12028),
    "WORKINGTON": (-17.86611, 30.98556),
    "GRANITESIDE": (-17.84667, 31.02139),
    "ARDBENNIE": (-17.86194, 31.03333),
    "SIMON MAZORODZE": (-17.91083, 31.00639),
    "SIMON MAZORODZE WAREHOUSE": (-17.91222, 31.00444),
    "BLUE RIBBON FOODS": (-17.86250, 31.02167),
    "BOND STORAGE": (-17.85056, 31.03639),
    "ANYHOME HEADOFFICE": (-17.82250, 31.04972),
    "MASIMBA HQ": (-17.80944, 31.04472),
    "HARARE CSD WORKSHOP": (-17.85222, 31.01528),

    # =========================
    # ROADS / LANDMARKS
    # =========================
    "MBUDZI ROUNDABOUT": (-17.93833, 30.99556),
    "SEKE ROAD": (-17.91000, 31.01000),
    "AIRPORT ROAD": (-17.91889, 31.06222),
    "OLD MAZOWE ROAD": (-17.74778, 31.04528),
    "OLD MAZOWE ROAD / PARLIAMENT ROAD": (-17.74444, 31.04694),
    "HARARE DRIVE": (-17.80000, 31.05000),
    "HARARE DRIVE & SECOND STREET": (-17.79944, 31.04167),
    "CNR 7TH & HERBERT CHITEPO": (-17.82833, 31.04639),
    "CNR 7TH & CHINAMANO": (-17.82917, 31.04444),
    "CNR BORROWDALE RD & CHURCHILL": (-17.78889, 31.08556),
    "BISHOP GAUL AVE": (-17.82139, 31.01222),

    # =========================
    # INSTITUTIONS
    # =========================
    "NEW PARLIAMENT, MT HAMPDEN": (-17.70694, 30.94278),
    "HEPA (DEFENCE COLLEGE)": (-17.69611, 30.94861),
    "CHISIPITE SCHOOL, HARARE": (-17.78972, 31.12333),
    "RUZAWI SCHOOL, MARONDERA": (-18.21056, 31.54861),
    "HARARE SHOWGROUND": (-17.83389, 31.01250),
    "WARREN HILLS GOLF COURSE": (-17.81139, 30.99361),

    # =========================
    # MINES
    # =========================
    "ZIMPLATS, NGEZI": (-18.05083, 30.75389),
    "ZIMPLATS SMC": (-18.04861, 30.75833),
    "TROJAN MINE": (-17.40056, 31.19222),
    "SHAMVA GOLD MINE": (-17.31139, 31.57583),
    "RAN MINE, BINDURA": (-17.31750, 31.32444),
    "BLANKET MINE, GWANDA": (-20.94472, 29.03389),
    "POMONA QUARRIES": (-17.74778, 31.06389),
    "ZULU LITHIUM MINE": (-17.32306, 30.86444),
    "SABI STAR MINE": (-20.36722, 32.60361),
    "JENA MINE": (-18.06417, 30.92833),
    "MIMOSA MINE": (-20.32944, 30.02722),
    "UNKI MINE": (-19.59694, 30.18806),
    "KARO MINE": (-17.38139, 30.83222),
    "ZENITH MINE": (-18.17639, 30.99778),
    "ATHENS MINE": (-17.35417, 30.94194),
    "PICKSTONE MINE": (-18.10056, 30.99528),
    "DOROWA MINE": (-19.56667, 31.75000),
    "SANDAWANA MINE": (-20.59583, 30.29111),

    # =========================
    # FARMS / ESTATES
    # =========================
    "RIMBIKI FARM, MVURWI": (-17.01306, 30.85139),
    "PORTER'S FARM, NORTON": (-17.87806, 30.70972),
    "POTTA'S FARM, NORTON": (-17.87528, 30.70694),
    "NEW YEAR'S GIFT ESTATE, CHIPINGE": (-20.21722, 32.62806),
    "JERSEY ESTATE, CHIPINGE": (-20.20472, 32.64167),
    "TINGAMIRA ESTATE, CHIPINGE": (-20.19361, 32.61222),
    "KATIYO, HONDE VALLEY": (-18.23333, 32.75000),
    "CHIWESHE": (-17.41667, 30.91667),
    "UZUMBA MARAMBA PFUNGWE": (-17.03333, 32.58333),

    # =========================
    # TOWNS / RURAL
    # =========================
    "MADZIWA": (-16.91404, 31.53122),
    "MURAMBINDA": (-19.27000, 31.65000),
    "NYAMAPANDA": (-16.96670, 32.86670),
    "KOTWA": (-16.99625, 32.66730),
    "MVURWI": (-17.03330, 30.85000),
    "CONCESSION": (-17.38330, 30.95000),
    "MAHUSEKWA": (-18.31670, 31.20000),
    "RUSHINGA": (-16.78444, 32.21944),
    "GURUVE": (-16.66667, 30.70000),
    "HWEDZA": (-18.70444, 31.66028),
    "MBERENGWA": (-20.45000, 30.65000),
    "BIKITA": (-20.15000, 31.80000),
    "MWENEZI": (-21.35722, 30.70694),
    "ESIGODINI": (-20.29278, 28.92222),
    "GOKWE": (-18.21667, 28.93333),
    "MUZARABANI": (-16.40000, 31.65000),
    "KANYEMBA": (-15.63333, 30.45000),

    # =========================
    # CROSS-BORDER
    # =========================
    "SOLWEZI": (-12.16880, 26.38940),
    "KANSANSHI": (-12.09640, 26.42760),
    "LUSAKA": (-15.41667, 28.28333),
    "NACALA": (-14.56257, 40.68538),
    "BALAMA, MOZAMBIQUE": (-13.30972, 38.57583),
}

def _ensure_location_coords(location_name: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Ensure FT Location has latitude / longitude.
    1. Check ZIM_COORDS dictionary for matches.
    2. Check "FT Location" doctype.
    3. Try OpenAI once, store to doc, return.
    """
    if not location_name:
        return None, None

    clean_name = location_name.strip().upper()

    # 1. Quick lookup for common towns
    if clean_name in ZIM_COORDS:
        return ZIM_COORDS[clean_name]

    # 2. Try partial match in ZIM_COORDS
    for town, coords in ZIM_COORDS.items():
        if town in clean_name:
            return coords

    # 3. Check Database (FT Location)
    try:
        loc_data = frappe.db.get_value(
            "FT Location",
            location_name,
            ["latitude", "longitude", "location_name"],
            as_dict=True,
            ignore_permissions=True,
        )
    except Exception:
        loc_data = None

    if loc_data:
        lat = loc_data.get("latitude")
        lng = loc_data.get("longitude")
        if lat and lng:
            return float(lat), float(lng)

    # 4. Try OpenAI best-effort (if configured)
    pretty_label = (loc_data.get("location_name") if loc_data else None) or location_name
    lat, lng = _geocode_location_with_openai(pretty_label)

    if lat is not None and lng is not None:
        # Cache on the record if it exists
        if loc_data:
            try:
                frappe.db.set_value("FT Location", location_name, {
                    "latitude": lat,
                    "longitude": lng,
                }, update_modified=False, ignore_permissions=True)
            except Exception:
                pass
    
    return lat, lng


# ---------------------------------------------------------------------------
# Main API – overview
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_ft_breakdown_overview():
    """
    Main API for the Omnis Fleetrack dashboard.

    Returns (JSON-serialisable dict):

    {
      "kpis": {
          "active_machines": int,
          "machines_with_defects": int,
          "open_breakdowns": int,
          "urgent_open_breakdowns": int,
          "avg_days_on_bd_open": "float or null"
      },
      "recent_breakdowns": [...],
      "map_points": [...]
    }
    """

    # -------- Load breakdown data --------
    # Doctype name is "FT Breakdown Log" on this site.
    # Open breakdown = end_date is NOT set.
    # Urgent breakdown = urgent == 1 (uDBR).

    from frappe.utils import today, getdate, date_diff
    
    current_date = getdate(today())

    # Fetch rows
    open_rows = frappe.get_all(
        "FT Breakdown Log",
        filters={"end_date": ["is", "not set"]},
        fields=[
            "name",
            "machine",
            "model",
            "customer",
            "location",
            "urgent",
            "breakdown_date",
            "status",
            "resp",
            "warranty_status",
        ],
        order_by="breakdown_date desc",
        limit_page_length=200,
        ignore_permissions=True,
    )

    # Calculate days_on_bd in Python since it may be virtual
    for r in open_rows:
        if r.breakdown_date:
            r.days_on_bd = date_diff(current_date, getdate(r.breakdown_date))
        else:
            r.days_on_bd = 0

    # Recent = both open and closed, just latest 30 rows
    recent_rows = frappe.get_all(
        "FT Breakdown Log",
        filters={},
        fields=[
            "name",
            "machine",
            "customer",
            "location",
            "urgent",
            "breakdown_date",
            "end_date",
            "status",
        ],
        order_by="breakdown_date desc",
        limit_page_length=30,
        ignore_permissions=True,
    )

    # -------- KPIs --------
    open_count = len(open_rows)
    urgent_open = sum(1 for r in open_rows if r.urgent)
    active_machines = len({r.machine for r in open_rows if r.machine})
    
    # Placeholder until a dedicated Defects doctype is wired
    machines_with_defects = active_machines

    # Average days on BD for open breakdowns
    days_values = [r.days_on_bd for r in open_rows if r.days_on_bd is not None]
    avg_days_on_bd = round(sum(days_values) / len(days_values), 1) if days_values else None

    kpis = {
        "active_machines": active_machines,
        "machines_with_defects": machines_with_defects,
        "open_breakdowns": open_count,
        "urgent_open_breakdowns": urgent_open,   # uDBR
        "avg_days_on_bd_open": avg_days_on_bd,
    }

    # -------- Recent breakdown table --------
    recent_breakdowns = []
    for r in recent_rows:
        recent_breakdowns.append(
            {
                "name": r.name,
                "machine": r.machine,
                "customer": r.customer,
                "location": r.location,
                "urgent": bool(r.urgent),
                "breakdown_date": r.breakdown_date,
                "end_date": r.end_date,
                "status": r.status,
                "is_open": r.end_date is None,
            }
        )

    # -------- Map points (open breakdowns by FT Location) --------
    map_points = []
    
    for r in open_rows:
        if not r.location:
            continue
            
        lat, lng = _ensure_location_coords(r.location)
        # If no coordinates, we still send it (frontend will handle dummy Zimbabwe loc)
        
        map_points.append(
            {
                "name": r.name,
                "machine": r.machine,
                "customer": r.customer,
                "location": r.location,
                "lat": lat,
                "lng": lng,
                "urgent": bool(r.urgent),
            }
        )

    return {
        "kpis": kpis,
        "recent_breakdowns": recent_breakdowns,
        "map_points": map_points,
    }


# ---------------------------------------------------------------------------
# Map-only helper for the dashboard
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_ft_breakdown_map_points():
    """
    Lightweight helper used by the Omnis dashboard map.

    Simply reuses the map_points computed in get_ft_breakdown_overview, so the
    logic stays in one place.
    """
    try:
        data = get_ft_breakdown_overview()
        return data.get("map_points", [])  # type: ignore[return-value]
    except Exception:
        frappe.log_error(
            title="FT Breakdown Dashboard – get_ft_breakdown_map_points",
            message=frappe.get_traceback(),
        )
        return []


# ---------------------------------------------------------------------------
# Update helper – for modal (status + urgent + report text)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def update_ft_breakdown_status(
    name,
    status=None,
    urgent=None,
    report=None,
):
    """
    Minimal helper for Omnis modal to update Breakdown Log.

    - name   : FT Breakdown Log name (required)
    - status : new status (optional)
    - urgent : 1/0 or true/false to set urgent flag (optional)
    - report : new report/description text (optional)
    """

    if not name:
        frappe.throw("Missing breakdown name")

    doctype = "FT Breakdown Log"

    # Load doc with ignore_permissions so dashboard can update even when guest-ish
    doc = frappe.get_doc(doctype, name)

    if status is not None:
        doc.db_set("status", status, update_modified=False)

    if urgent is not None:
        val = 1 if str(urgent).lower() in ("1", "true", "yes", "y") else 0
        if hasattr(doc, "urgent"):
            doc.db_set("urgent", val, update_modified=False)

    if report:
        # Try to find a field whose LABEL is "Report" first
        target_fieldname = None
        meta = frappe.get_meta(doctype)
        for f in meta.fields:
            if (f.label or "").strip().lower() == "report":
                target_fieldname = f.fieldname
                break

        # Fallbacks: common fieldnames used for similar purposes
        if not target_fieldname:
            for f in meta.fields:
                if f.fieldname in ("report", "description", "subject", "title"):
                    target_fieldname = f.fieldname
                    break

        if target_fieldname and hasattr(doc, target_fieldname):
            doc.db_set(target_fieldname, report, update_modified=False)

    # Re-load a light copy to return to the dashboard
    refreshed = frappe.get_doc(doctype, name)
    return {
        "ok": True,
        "name": refreshed.name,
        "status": getattr(refreshed, "status", None),
        "urgent": bool(getattr(refreshed, "urgent", 0)),
    }


# ---------------------------------------------------------------------------
# Daily Breakdown Report (DBR) - Full data endpoint
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_ft_breakdown_dbr_v2(region=None, customer=None, machine=None, responsibility=None, urgent=None):
    """
    Get open breakdowns for DBR with optional filtering.
    """
    try:
        from frappe.utils import today, getdate, date_diff
        current_date = getdate(today())

        # 1. Fetch ALL open breakdowns first (to avoid Unknown Column errors in SQL)
        open_rows = frappe.get_all(
            "FT Breakdown Log",
            filters={"end_date": ["is", "not set"]},
            fields=["*"],
            order_by="breakdown_date desc",
            limit_page_length=500,
            ignore_permissions=True,
        )

        # 2. Enrich with Machine data
        machine_names = list(set([r.get("machine") for r in open_rows if r.get("machine")]))
        machine_map = {}
        if machine_names:
            machines = frappe.get_all(
                "FT Machine",
                filters={"name": ["in", machine_names]},
                fields=["name", "region", "sn", "fleet_no", "current_hmr", "model"]
            )
            for m in machines:
                machine_map[m.name] = m

        filtered_rows = []
        
        # 3. Apply Filters in Python & Enrich
        for r in open_rows:
            m = machine_map.get(r.get("machine"), {})
            
            # Map machine data to the row
            r["region"] = m.get("region")
            r["serial_number"] = m.get("sn") or m.get("name")
            r["fleet_no"] = m.get("fleet_no")
            r["current_hmr"] = m.get("current_hmr")
            r["machine_model"] = m.get("model")
            
            # Create user-friendly display name (e.g., "Shantui ER20-121")
            machine_name = r.get("machine") or ""
            model = m.get("model") or ""
            # Extract short identifier (e.g., "ER20-121" from "ER20-121 B16180LA0016")
            short_id = machine_name.split()[0] if machine_name else ""
            r["machine_display_name"] = f"{model} {short_id}".strip() if model and short_id else machine_name
            
            # Calc days on breakdown
            bd_date = r.get("breakdown_date")
            if bd_date:
                r["days_on_bd"] = date_diff(current_date, getdate(bd_date))
            else:
                r["days_on_bd"] = 0

            # --- DATA NORMALIZATION ---
            # Ensure supervisor_comment is populated even if data is in manager_comments
            # This handles the case where the schema update might be missing or fallback was used
            if not r.get("supervisor_comment") and r.get("manager_comments"):
                r["supervisor_comment"] = r.get("manager_comments")

            # --- FILTER LOGIC ---
            # Region match
            if region and region.lower() != (r.get("region") or "").lower():
                continue
                
            # Customer match
            if customer:
                c_val = (r.get("customer") or "").lower()
                if customer.lower() not in c_val:
                    continue
            
            # Machine match (SN, Model, Fleet No)
            if machine:
                m_search = machine.lower()
                m_sn = (r.get("serial_number") or "").lower()
                m_model = (r.get("machine_model") or "").lower()
                m_fleet = (r.get("fleet_no") or "").lower()
                m_link = (r.get("machine") or "").lower()
                
                if m_search not in m_sn and m_search not in m_model and m_search not in m_fleet and m_search not in m_link:
                    continue
            
            # Responsibility match
            if responsibility and responsibility.upper() != (r.get("resp") or "").upper():
                continue

            # Urgent match
            # If urgent is provided (as a string "0", "1", or int), we need to handle it robustly
            if urgent is not None:
                urgent_val = frappe.utils.cint(urgent)
                # If urgent filter is on (1), only show urgent. 
                # If urgent filter is off (0), show everything (don't continue).
                if urgent_val == 1 and not r.get("urgent"):
                    continue

            filtered_rows.append(r)

        # Check permissions for Manager Comments
        user = frappe.session.user
        roles = frappe.get_roles(user)
        print(f"DEBUG ROLES for {user}: {roles}")
        
        # Robust check with case-insensitivity
        u_clean = (user or "").lower().strip()
        target_user = "support.tapiwa@machinery-exchange.com"
        
        is_specific_user = u_clean == target_user
        
        can_edit_comments = ("System Manager" in roles or 
                             "Fleet Manager" in roles or 
                             "Administrator" in roles or 
                             is_specific_user or
                             "System Manager" in frappe.get_roles())

        return {
            "breakdowns": filtered_rows,
            "efficiency": f"Total: {len(filtered_rows)}",
            "can_edit_comments": can_edit_comments,
            "breakdown_count": len(filtered_rows),
            "current_user": user, # Return for debug
            "debug": "Filter Applied" if (region or customer or machine or responsibility) else "All Data"
        }

    except Exception:
        import traceback
        return {
            "error": True,
            "traceback": traceback.format_exc(),
            "efficiency": "BACKEND ERROR"
        }

@frappe.whitelist(allow_guest=True)
def update_ft_breakdown_full(
    name, description=None, ted=None, red=None, status=None, parts_eta=None, 
    supervisor_comment=None, supervisor_approved=None,
    breakdown_date=None, end_date=None, quote_date=None, out_eta=None,
    ted_status=None, resp=None, category=None, 
    is_the_machine_still_running=None, urgent=None, on_hold=None
):
    """
    Update breakdown fields from DBR Edit Modal.
    Supervisor Comment requires specific roles.
    """
    if not name:
        return {"error": "Missing name"}

    try:
        doc = frappe.get_doc("FT Breakdown Log", name)
        
        # Use db_set() for all fields to bypass "Select" validation on Status
        # and to ensure we don't trip over existing invalid data in the doc.
        
        if description is not None:
            doc.db_set("description", description)
        
        # Date Fields Handling
        date_map = {
            "ted": ted,
            "red": red,
            "breakdown_date": breakdown_date,
            "end_date": end_date,
            "quote_date": quote_date,
            "out_eta": out_eta
        }
        for field, val in date_map.items():
            if val:
                doc.db_set(field, val)
            else:
                doc.db_set(field, None)

        # Text/Select Fields
        if status is not None:
            doc.db_set("status", status)
        if parts_eta is not None:
            doc.db_set("parts_eta", parts_eta if parts_eta else None)
        if ted_status:
            doc.db_set("ted_status", ted_status)
        if resp:
            doc.db_set("resp", resp)
        if category:
            doc.db_set("category", category)
        if is_the_machine_still_running:
            doc.db_set("is_the_machine_still_running", is_the_machine_still_running)
            
        # Checkboxes
        if urgent is not None:
            doc.db_set("urgent", 1 if urgent else 0)
        if on_hold is not None:
            doc.db_set("on_hold", 1 if on_hold else 0)
            
        # Permission check for comments and approval
        if supervisor_comment is not None or supervisor_approved is not None:
            roles = frappe.get_roles()
            has_manager_role = "System Manager" in roles or "Fleet Manager" in roles or "Administrator" in roles
            
            if not has_manager_role:
                 return {"error": "Insufficient Permission: Manager Role Required"}

            # Check if fields exist before updating to avoid "Unknown column" error
            if supervisor_comment is not None:
                # Try saving to supervisor_comment first using direct DB set
                try:
                    frappe.db.set_value("FT Breakdown Log", name, "supervisor_comment", supervisor_comment)
                except Exception:
                    # If that fails (likely column missing), fallback to manager_comments
                    try:
                        frappe.db.set_value("FT Breakdown Log", name, "manager_comments", supervisor_comment)
                    except Exception as e:
                        return {"error": f"Database Error: Could not save comment. {str(e)}"}
                    
            if supervisor_approved is not None:
                try:
                     frappe.db.set_value("FT Breakdown Log", name, "supervisor_approved", int(supervisor_approved))
                except Exception:
                     pass

        # Force commit to ensure changes are persisted immediately
        frappe.db.commit()
        
        return {"ok": True}
        
    except Exception as e:
        frappe.log_error(f"FT Dashboard Update Error: {str(e)}")
        return {
            "error": str(e),
            "traceback": frappe.get_traceback()
        }

@frappe.whitelist(allow_guest=True)
def get_ft_machine_register(region=None, customer=None, model=None, warranty_status=None):
    """
    Get all machines for the Machine Register.
    Bypasses read permissions for Guest/System users.
    CORS-enabled for local development if needed.
    """
    filters = {}
    if region: filters["region"] = region
    if customer: filters["customer"] = ["like", f"%{customer}%"]
    if model: filters["model"] = ["like", f"%{model}%"]
    if warranty_status: filters["warranty_status"] = warranty_status

    ft_managed = frappe.form_dict.get("fleetrack_managed")
    if ft_managed: filters["fleetrack_managed"] = ft_managed

    machines = frappe.get_all(
        "FT Machine",
        filters=filters,
        fields=[
            "name", "customer", "region", "model", "type",
            "fleet_no", "sn", "mxg_fleet_no", "location",
            "warranty_status", "warranty_type", "current_hmr",
            "oem", "esn", "machine_picture",
            "chassis_number", "has_telematics_device", "engine_type",
            "next_service_hmr", "modified", "fleetrack_managed",
            "service_obligation", "service_interval_hours", "last_service_date",
            "last_service_hmr", "last_service_type", "next_service_type",
            "hours_remaining_to_service"
        ],
        order_by="name asc",
        limit_page_length=5000,
        ignore_permissions=True
    )

    return {"data": machines}


# ---------------------------------------------------------------------------
# WhatsApp Report Generator
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_whatsapp_report_texts(filters_json=None):
    """
    Generate formatted WhatsApp report texts for the filtered breakdown list.
    Returns:
        {
            "internal_report": "...",
            "customer_reports": [
                {"customer": "Name", "text": "..."},
                ...
            ]
        }
    """
    filter_dict = {}
    if filters_json:
        try:
            filter_dict = json.loads(filters_json)
        except:
            pass

    # Pass individual arguments to v2
    dbr_data = get_ft_breakdown_dbr_v2(
        region=filter_dict.get("region"),
        customer=filter_dict.get("customer"),
        machine=filter_dict.get("machine"),
        responsibility=filter_dict.get("responsibility"),
        urgent=filter_dict.get("urgent")
    )
    rows = dbr_data.get("breakdowns", [])

    internal_lines = []
    
    # Helper to safe str
    def s(val): return str(val) if val else "TBA"
    
    width_map = {} # customer -> list of rows

    currentTime = frappe.utils.now_datetime().strftime("%d-%m-%Y")
            
    region_label = (filter_dict.get("region") or "ALL REGIONS").upper()
    internal_lines.append(f"*UDBR - {region_label} - {currentTime}*")
    internal_lines.append("")

    for idx, r in enumerate(rows, start=1):
        cust = s(r.get("customer"))
        # Use display name (e.g., "Shantui ER20-121")
        sn = s(r.get("machine_display_name"))
        if sn == "TBA": sn = s(r.get("name")) 
        
        loc = s(r.get("location") or r.get("region"))
        fleet = s(r.get("fleet_no"))
        bd_date = s(r.get("breakdown_date"))
        dur = s(r.get("days_on_bd"))
        desc = s(r.get("description"))
        stat = s(r.get("status"))
        ted_stat = s(r.get("ted_status"))
        ted_date = s(r.get("ted"))
        parts_eta = s(r.get("parts_eta"))
        
        entry = []
        entry.append(f"{idx}) *Customer*: {cust}")
        entry.append(f"   *Machine*: {sn}") 
        entry.append(f"   *Location*: {loc}")
        entry.append(f"   *Fleet no*: {fleet}")
        entry.append(f"   *Date of BD*: {bd_date}")
        entry.append(f"   *Duration*: {dur}")
        entry.append(f"   *Description*: {desc}")
        entry.append(f"   *Status*: {stat}")
        
        # TED Logic
        # TED Logic
        red_date = s(r.get("red"))

        # Skip TED Status if Available
        if ted_stat and ted_stat.lower() != "tba" and ted_stat.lower() != "available":
             entry.append(f"   *TED Status*: {ted_stat}")
             
        # RED takes precedence over TED
        if red_date and red_date != "TBA":
             entry.append(f"   *RED*: {red_date}")
        elif ted_date and ted_date != "TBA":
             entry.append(f"   *TED*: {ted_date}")
        elif (not ted_stat or ted_stat.lower() == "tba") and (not red_date or red_date == "TBA"):
             entry.append(f"   *TED Status*: TBA")

        if parts_eta and parts_eta != "TBA":
             entry.append(f"   *Parts ETA*: {parts_eta}")

        internal_lines.append("\n".join(entry))
        internal_lines.append("") 
        
        # Add to customer map
        if cust not in width_map:
            width_map[cust] = []
        width_map[cust].append(r)

    internal_text = "\n".join(internal_lines)

    # Format Customer Reports
    customer_reports = []
    
    for customer, c_rows in width_map.items():
        # Filter: Only include breakdowns approved by supervisor for Customer Report
        approved_rows = [r for r in c_rows if r.get("supervisor_approved")]
        
        if not approved_rows:
            continue

        c_lines = []
        c_lines.append(f"*Status Report - {customer} - {currentTime}*")
        c_lines.append("")
        
        for idx, r in enumerate(approved_rows, start=1):
            cust = s(r.get("customer"))
            sn = s(r.get("machine_display_name")) # Use display name
            if sn == "TBA": sn = s(r.get("name"))

            loc = s(r.get("location") or r.get("region"))
            fleet = s(r.get("fleet_no"))
            bd_date = s(r.get("breakdown_date"))
            dur = s(r.get("days_on_bd"))
            desc = s(r.get("description"))
            stat = s(r.get("status"))
            ted_stat = s(r.get("ted_status"))
            ted_date = s(r.get("ted"))
            parts_eta = s(r.get("parts_eta"))

            entry = []
            # Customer specific format - usually implies fewer internal numbers
            entry.append(f"{idx}) *Machine*: {sn}") 
            entry.append(f"   *Fleet no*: {fleet}")
            entry.append(f"   *Location*: {loc}")
            entry.append(f"   *Date of BD*: {bd_date}")
            entry.append(f"   *Duration*: {dur}")
            entry.append(f"   *Description*: {desc}")
            entry.append(f"   *Status*: {stat}")
            
            # TED Logic
            red_date = s(r.get("red"))

            if ted_stat and ted_stat.lower() != "tba" and ted_stat.lower() != "available":
                 entry.append(f"   *TED Status*: {ted_stat}")

            if red_date and red_date != "TBA":
                 entry.append(f"   *RED*: {red_date}")
            elif ted_date and ted_date != "TBA":
                 entry.append(f"   *TED*: {ted_date}")
            
            if parts_eta and parts_eta != "TBA":
                 entry.append(f"   *Parts ETA*: {parts_eta}")
                 
            c_lines.append("\n".join(entry))
            c_lines.append("")

        customer_reports.append({
            "customer": customer,
            "text": "\n".join(c_lines)
        })

    return {
        "internal_report": internal_text,
        "customer_reports": customer_reports
    }


# ---------------------------------------------------------------------------
# Whapi Cloud Integration for WhatsApp Sending
# ---------------------------------------------------------------------------

import re
import requests

WHAPI_BASE = "https://gate.whapi.cloud"
WHAPI_TOKEN = "jUIxZSP9qy1UmVM1zaPvRKclZfOnouyt"
SUPERVISOR_MOBILE = "+263774454839"


def _get_whapi_token():
    """Get Whapi token from config or hardcoded value."""
    token = (WHAPI_TOKEN or frappe.conf.get("whapi_token") or "").strip()
    if not token:
        raise Exception("Whapi token is missing")
    return token


def _whapi_headers():
    """Build authorization headers for Whapi API."""
    return {
        "Authorization": f"Bearer {_get_whapi_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _normalize_to(to):
    """
    Normalize WhatsApp 'to' field for Whapi.
    If it has '@', return as is. Otherwise strip to digits only.
    """
    to = (to or "").strip()
    if "@" in to:
        return to
    digits = re.sub(r"\D", "", to)
    return digits


def _send_whapi_text(to, body):
    """Send plain text message via Whapi Cloud."""
    to_norm = _normalize_to(to)
    payload = {"to": to_norm, "body": body}
    
    try:
        resp = safe_requests(
            "POST",
            f"{WHAPI_BASE}/messages/text",
            headers=_whapi_headers(),
            data=json.dumps(payload),
            timeout=15,
        )
        
        if not resp.ok:
            frappe.log_error(
                f"Status: {resp.status_code}\nPayload:\n{json.dumps(payload, indent=2)}\n\nResponse:\n{resp.text}",
                "Whapi text send failed",
            )
            return {"ok": False, "error": f"HTTP {resp.status_code}", "details": resp.text}
        
        return {"ok": True, "response": resp.json()}
    except Exception as e:
        frappe.log_error(f"Whapi send exception: {str(e)}", "Whapi send failed")
        return {"ok": False, "error": str(e)}


def _send_whapi_interactive(to, body, buttons, footer=None):
    """
    Send interactive button message via Whapi Cloud according to Support Docs.
    Docs: https://support.whapi.cloud/help-desk/sending/send-message-with-buttons
    """
    to_norm = _normalize_to(to)
    
    # Flat payload structure as per Support Docs
    payload = {
        "to": to_norm,
        "type": "button",
        "body": {
            "text": body
        },
        "action": {
            "buttons": [
                {
                    "type": "quick_reply",
                    "title": b["text"][:20],
                    "id": b["id"]
                } for b in buttons
            ]
        }
    }
    
    if footer:
        payload["footer"] = {"text": footer}

    try:
        resp = safe_requests(
            "POST",
            f"{WHAPI_BASE}/messages/interactive",
            headers=_whapi_headers(),
            data=json.dumps(payload),
            timeout=15,
        )
        
        if not resp.ok:
            frappe.log_error(f"Whapi Interactive failed (HTTP {resp.status_code}): {resp.text}\nPayload: {json.dumps(payload)}", "Whapi Interactive error")
            return {"ok": False, "error": f"HTTP {resp.status_code}", "details": resp.text}
            
        return {"ok": True, "response": resp.json()}
    except Exception as e:
        frappe.log_error(f"Whapi interactive exception: {str(e)}", "Whapi send failed")
        return {"ok": False, "error": str(e)}


def _send_whapi_list(to, body, button_text, sections, title=None, footer=None):
    """
    Send an interactive list message via Whapi.
    """
    to_norm = _normalize_to(to)
    
    payload = {
        "to": to_norm,
        "type": "list",
        "body": {
            "text": body
        },
        "action": {
            "button": button_text,
            "sections": sections
        }
    }
    
    if title:
        payload["header"] = {"type": "text", "text": title}
    if footer:
        payload["footer"] = {"text": footer}

    try:
        url = f"{WHAPI_BASE}/messages/interactive"
        resp = safe_requests(
            "POST",
            url,
            headers=_whapi_headers(),
            data=json.dumps(payload),
            timeout=15,
        )
        # Log result for debugging
        import os
        log_path = os.path.join(frappe.get_site_path(), "whapi_webhook_debug.log")
        with open(log_path, "a") as f:
            f.write(f"\n--- List Message Sent to {to_norm} via /interactive ---\n")
            f.write(f"Status: {resp.status_code}\n")
            f.write(f"Response: {resp.text}\n")

        if not resp.ok:
            frappe.log_error(f"Whapi List failed (HTTP {resp.status_code}): {resp.text}\nPayload: {json.dumps(payload)}", "Whapi List error")
            return {"ok": False, "error": f"HTTP {resp.status_code}", "details": resp.text}
        return {"ok": True, "response": resp.json()}
    except Exception as e:
        frappe.log_error(f"Whapi list exception: {str(e)}", "Whapi list send failed")
        return {"ok": False, "error": str(e)}


@frappe.whitelist(allow_guest=True)
def send_internal_report_whatsapp(filters_json=None):
    """
    Send the interactive review invitation to the supervisor.
    """
    try:
        import json
        filters = {}
        if filters_json:
            filters = json.loads(filters_json)
            
        # Get raw data instead of just text
        dbr_data = get_ft_breakdown_dbr_v2(
            region=filters.get("region"),
            customer=filters.get("customer"),
            machine=filters.get("machine"),
            responsibility=filters.get("responsibility"),
            urgent=filters.get("urgent")
        )
        rows = dbr_data.get("breakdowns", [])
        
        # Filter for unapproved items only
        unapproved = [r for r in rows if not r.get("supervisor_approved")]
        
        if not unapproved:
            return {
                "ok": False,
                "error": "No unapproved breakdown records to review"
            }
        
        count = len(unapproved)
        date_str = frappe.utils.now_datetime().strftime("%d-%m-%Y")
        
        # Store the breakdown list in cache
        session_key = f"fsi_review_{SUPERVISOR_MOBILE.replace('+', '')}"
        frappe.cache().set_value(session_key, {
            "ids": [r.get("name") for r in unapproved],
            "index": 0,
            "filters": filters
        }, expires_in_sec=3600*24)
        
        # Custom Assistant Persona Greeting
        hour = frappe.utils.now_datetime().hour
        if hour < 12:
            time_greet = "Good morning"
        elif hour < 18:
            time_greet = "Good afternoon"
        else:
            time_greet = "Good evening"

        intro = f"🤖 *Omnis Assistant*\n\n{time_greet} Mr. Huni!\n"
        
        if count > 10:
            status_msg = f"We have a bit of a long haul today with {count} entries to look at. 🚛 Ready whenever you are!"
        else:
            status_msg = f"I've prepared {count} entries for your attention. Do you have a minute to go through them? 😊"

        body = f"{intro}\n{status_msg}\n\n*Date:* {date_str}"
        
        buttons = [
            {"id": "review_start", "text": "Start Review"}
        ]
        
        result = _send_whapi_interactive(SUPERVISOR_MOBILE, body, buttons)
        
        if result.get("ok"):
            return {"ok": True, "message": "Review request sent"}
        else:
            # Fallback to plain text if interactive fails
            fallback_body = body + "\n\n(Buttons failed, please reply 'Review' to start)"
            _send_whapi_text(SUPERVISOR_MOBILE, fallback_body)
            return {"ok": True, "message": "Buttons failed, sent fallback text"}
            
    except Exception as e:
        frappe.log_error(f"Send internal report error: {str(e)}", "WhatsApp Send Failed")
        return {
            "ok": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def get_whapi_log():
    """
    Read and return the Whapi webhook debug log.
    Used for troubleshooting remote webhook hits.
    """
    import os
    log_path = os.path.join(frappe.get_site_path(), "whapi_webhook_debug.log")
    if not os.path.exists(log_path):
        return "Log file not found."
    
    with open(log_path, "r") as f:
        # Return last 100 lines for efficiency
        lines = f.readlines()
        return "".join(lines[-100:])

@frappe.whitelist(allow_guest=True)
def whapi_webhook():
    """
    Handle incoming messages and interactions from Whapi Cloud.
    Requires setting this URL in the Whapi dashboard webhook settings.
    """
    try:
        data = frappe.request.get_json()
        
        # LOG TO FILE
        import os
        log_path = os.path.join(frappe.get_site_path(), "whapi_webhook_debug.log")
        with open(log_path, "a") as f:
            f.write(f"\n--- {frappe.utils.now()} ---\n")
            f.write(json.dumps(data, indent=2))
            f.write("\n")
            
        if not data or not data.get("messages"):
            return {"ok": True} # Ignore empty or non-message payloads
            
        for msg in data.get("messages", []):
            sender = msg.get("from", "").split("@")[0] # Normalize digits
            if not sender.startswith("+"):
                sender = "+" + sender
            
            msg_type = msg.get("type")
            btn_id = None
            
            # Whapi sends button clicks as 'interactive' or 'reply'
            if msg_type in ["interactive", "reply"]:
                # Try 'interactive' structure
                inter = msg.get("interactive", {})
                subtype = inter.get("type")
                if subtype == "button_reply":
                    btn_id = inter.get("button_reply", {}).get("id")
                elif subtype == "buttons_reply":
                    btn_id = inter.get("buttons_reply", {}).get("id")
                elif subtype == "list_reply":
                    btn_id = inter.get("list_reply", {}).get("id")
                
                # Try 'reply' structure
                if not btn_id and msg.get("reply"):
                    rep = msg.get("reply", {})
                    rep_type = rep.get("type")
                    if rep_type in ["button_reply", "buttons_reply", "list_reply"]:
                        btn_id = rep.get(rep_type, {}).get("id")

                # Normalize: Strip Whapi's "ButtonsV3:" prefix if present
                if btn_id and ":" in btn_id:
                    btn_id = btn_id.split(":")[-1]

            if btn_id:
                if btn_id == "review_start":
                    return _send_next_review_entry(sender, 0)
                        
                elif btn_id.startswith("signoff_"):
                    log_name = btn_id.replace("signoff_", "")
                    frappe.db.set_value("FT Breakdown Log", log_name, "supervisor_approved", 1)
                    
                    session_key = f"fsi_review_{sender.replace('+', '')}"
                    session = frappe.cache().get_value(session_key)
                    if session:
                        ids = session.get("ids", [])
                        idx = session.get("index", 0)
                        if idx < len(ids) and ids[idx] == log_name:
                            return _send_next_review_entry(sender, idx + 1)
                        else:
                            _send_whapi_text(sender, f"✅ Signed Off (Past): {log_name}")
                    else:
                        _send_whapi_text(sender, "Session expired. Please trigger again.")
                
                elif btn_id.startswith("edit_menu_"):
                    log_name = btn_id.replace("edit_menu_", "")
                    body = f"Select the field you want to edit for *{log_name}*:"
                    sections = [{
                        "title": "Available Fields",
                        "rows": [
                            {"id": f"choice_description_{log_name}", "title": "Description", "description": "Update the breakdown details"},
                            {"id": f"choice_status_{log_name}", "title": "Status", "description": "Update current tech status"},
                            {"id": f"choice_ted_{log_name}", "title": "Target Date (TED)", "description": "Set a new completion date"}
                        ]
                    }]
                    res = _send_whapi_list(sender, body, "Choose Field", sections)
                    if not res.get("ok"):
                        # Fallback to plain text instructions if List Message fails
                        fallback = f"📝 *Edit {log_name}*\n\nPlease reply with a number or text:\n1️⃣ *Description*\n2️⃣ *Status*\n3️⃣ *Target Date (TED)*"
                        _send_whapi_text(sender, fallback)
                    return res

                elif btn_id.startswith("choice_"):
                    # user picked a field from the list
                    parts = btn_id.split("_")
                    field_key = parts[1] # description, status, or ted
                    log_name = "_".join(parts[2:])
                    
                    # Store field + record in cache
                    frappe.cache().set_value(f"awaiting_field_{sender.replace('+', '')}", {
                        "log_name": log_name,
                        "field": field_key
                    }, expires_in_sec=600)
                    
                    prompt = f"Please reply with the new *{field_key.upper()}*."
                    if field_key == "ted":
                        prompt += "\nFormat: *DD-MM-YYYY* (e.g., 30-01-2026)"
                    
                    return _send_whapi_text(sender, prompt)

                elif btn_id == "review_skip":
                    session_key = f"fsi_review_{sender.replace('+', '')}"
                    session = frappe.cache().get_value(session_key)
                    if session:
                        return _send_next_review_entry(sender, session.get("index", 0) + 1)

            # Check if this is a text message reply for a pending edit
            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "").strip()
                
                # Check for start keyword
                if text_body.lower() in ["review", "start", "go", "begin"]:
                    session_key = f"fsi_review_{sender.replace('+', '')}"
                    if frappe.cache().get_value(session_key):
                        return _send_next_review_entry(sender, 0)

                # Fallback keyword & Number handling
                if text_body.lower().startswith("edit ") or text_body.strip() in ["1", "2", "3"]:
                    session_key = f"fsi_review_{sender.replace('+', '')}"
                    session = frappe.cache().get_value(session_key)
                    if session:
                        ids = session.get("ids", [])
                        idx = session.get("index", 0)
                        if idx < len(ids):
                            log_name = ids[idx]
                            
                            sub = ""
                            raw = text_body.lower().strip()
                            if raw == "1" or "description" in raw:
                                sub = "description"
                            elif raw == "2" or "status" in raw:
                                sub = "status"
                            elif raw == "3" or "ted" in raw:
                                sub = "ted"
                                
                            if sub:
                                frappe.cache().set_value(f"awaiting_field_{sender.replace('+', '')}", {
                                    "log_name": log_name,
                                    "field": sub
                                }, expires_in_sec=600)
                                prompt = f"Please reply with the new *{sub.upper()}*."
                                if sub == "ted":
                                    prompt += "\nFormat: *DD-MM-YYYY* (e.g., 30-01-2026)"
                                return _send_whapi_text(sender, prompt)

                # Check cache for pending edit
                pending_edit = frappe.cache().get_value(f"awaiting_field_{sender.replace('+', '')}")
                if pending_edit:
                    log_name = pending_edit["log_name"]
                    field = pending_edit["field"]
                    
                    # Data mapping
                    db_field = field
                    if field == "description":
                        db_field = "description"
                    elif field == "status":
                        db_field = "status"
                    elif field == "ted":
                        db_field = "ted"
                    
                    val = text_body
                    
                    # Special validation for TED
                    if field == "ted":
                        import re
                        from datetime import datetime
                        if not re.match(r"^\d{2}-\d{2}-\d{4}$", val):
                            return _send_whapi_text(sender, "❌ Invalid format. Please use *DD-MM-YYYY* (e.g., 25-12-2026).")
                        
                        try:
                            # Parse input
                            input_date = datetime.strptime(val, "%d-%m-%Y").date()
                            today_date = frappe.utils.getdate()
                            if input_date < today_date:
                                return _send_whapi_text(sender, f"❌ Date cannot be in the past ({val}). Please try again.")
                            
                            # Valid date, convert to Frappe format YYYY-MM-DD
                            val = input_date.strftime("%Y-%m-%d")
                            # Mark as Available if TED changed
                            frappe.db.set_value("FT Breakdown Log", log_name, "ted_status", "Available")
                        except Exception:
                            return _send_whapi_text(sender, "❌ Error parsing date. Please try again with *DD-MM-YYYY*.")

                    # Update DB
                    frappe.db.set_value("FT Breakdown Log", log_name, db_field, val)
                    frappe.cache().delete_value(f"awaiting_field_{sender.replace('+', '')}")
                    
                    # Fetch for confirmation message
                    doc_for_msg = frappe.get_doc("FT Breakdown Log", log_name)
                    cust_name = doc_for_msg.customer or "TBA"
                    m_model = frappe.db.get_value("FT Machine", doc_for_msg.machine, "model") or doc_for_msg.machine or "TBA"
                    
                    # Confirmation
                    _send_whapi_text(sender, f"✅ Updated the *{field.upper()}* for {cust_name} - {m_model}")
                    
                    # Refresh the entry view so user sees the change
                    session_key = f"fsi_review_{sender.replace('+', '')}"
                    session = frappe.cache().get_value(session_key)
                    if session:
                        ids = session.get("ids", [])
                        idx = session.get("index", 0)
                        return _send_next_review_entry(sender, idx)

        return {"ok": True}
    except Exception as e:
        frappe.log_error(f"Whapi Webhook Error: {str(e)}", "Whapi Webhook Failed")
        return {"ok": False, "error": str(e)}


def _send_next_review_entry(supervisor_mobile, index):
    """
    Send the breakdown entry at the specified index to the supervisor.
    """
    session_key = f"fsi_review_{supervisor_mobile.replace('+', '')}"
    session = frappe.cache().get_value(session_key)
    
    if not session or not session.get("ids"):
        return _send_whapi_text(supervisor_mobile, "Review session ended or not found.")
        
    ids = session.get("ids", [])
    if index >= len(ids):
        # All done!
        frappe.cache().delete_value(session_key)
        return _send_whapi_text(supervisor_mobile, "✅ *Review Complete*\n\nAll entries have been processed. You can now generate the Customer Report from the dashboard.")
        
    # Update current index in cache
    session["index"] = index
    frappe.cache().set_value(session_key, session, expires_in_sec=3600*24)
    
    log_id = ids[index]
    doc = frappe.get_doc("FT Breakdown Log", log_id)
    
    # Fetch additional machine info
    m_region = "TBA"
    m_fleet = "TBA"
    m_sn = "TBA"
    m_model = "TBA"
    if doc.machine:
        m_data = frappe.db.get_value("FT Machine", doc.machine, ["region", "fleet_no", "sn", "model"], as_dict=True)
        if m_data:
            m_region = m_data.get("region") or "TBA"
            m_fleet = m_data.get("fleet_no") or "TBA"
            m_sn = m_data.get("sn") or doc.machine
            m_model = m_data.get("model") or "TBA"

    # Duration calculation
    from frappe.utils import date_diff, today
    duration = "0"
    if doc.breakdown_date:
        duration = str(date_diff(today(), doc.breakdown_date))

    # Format entry text
    total = len(ids)
    progress = f"[{index + 1}/{total}]"
    
    body = f"Review *{progress}*\n\n"
    body += f"*Customer*: {doc.customer or 'TBA'}\n"
    body += f"*Machine*: {m_model} {m_sn}\n"
    body += f"*Location*: {m_region}\n"
    body += f"*Fleet no*: {m_fleet}\n"
    body += f"*Date of BD*: {doc.breakdown_date or 'TBA'}\n"
    body += f"*Duration*: {duration} days\n"
    body += f"*Description*: {doc.description or 'TBA'}\n"
    body += f"*Status*: {doc.status or 'TBA'}\n"
    body += f"*TED*: {doc.ted or 'TBA'}"
    
    buttons = [
        {"id": f"signoff_{log_id}", "text": "✅ Sign Off"},
        {"id": f"edit_menu_{log_id}", "text": "📝 Edit Fields"},
        {"id": "review_skip", "text": "➡️ Next"}
    ]
    
    return _send_whapi_interactive(supervisor_mobile, body, buttons)


@frappe.whitelist(allow_guest=True)
def send_customer_report_whatsapp(customer, report_text):
    """
    Send a report text to a customer's WhatsApp group.
    Retrieves the group ID from the "FT Customer" doctype.
    """
    try:
        if not customer or not report_text:
            return {"ok": False, "error": "Missing customer or report text"}

        # Fetch the customer record to get the WhatsApp Group ID
        cust_data = frappe.db.get_value("FT Customer", {"name": customer}, ["whatsapp_group_id"], as_dict=True)
        
        if not cust_data:
            cust_data = frappe.db.get_value("FT Customer", {"customer_name": customer}, ["whatsapp_group_id"], as_dict=True)

        group_id = cust_data.get("whatsapp_group_id") if cust_data else None

        if not group_id:
            return {
                "ok": False,
                "error": f"WhatsApp Group ID missing for customer '{customer}'. Please notify the administrator to add it in the FT Customer record."
            }

        # Send via Whapi
        result = _send_whapi_text(group_id, report_text)
        
        if result.get("ok"):
            # SUCCESS: Mark relevant logs as "Sent to Customer"
            try:
                logs_to_update = frappe.get_all(
                    "FT Breakdown Log",
                    filters={
                        "customer": customer,
                        "supervisor_approved": 1,
                        "sent_to_customer": 0,
                        "end_date": ["is", "not set"]
                    },
                    fields=["name"]
                )
                
                for log in logs_to_update:
                    frappe.db.set_value("FT Breakdown Log", log.name, "sent_to_customer", 1)
                
                frappe.db.commit()
                
            except Exception as update_err:
                frappe.log_error(f"Failed to update sent_to_customer flags: {update_err}", "DB Update Error")

            return {
                "ok": True,
                "message": f"Report sent to {customer} group. {len(logs_to_update)} records marked as sent."
            }
        else:
            return {
                "ok": False,
                "error": result.get("error", "Unknown error"),
                "details": result.get("details")
            }

    except Exception as e:
        frappe.log_error(f"Send customer report error: {str(e)}", "WhatsApp Customer Send Failed")
        return {
            "ok": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def create_ft_breakdown_log(
    machine: str,
    description: str,
    date: str | None = None,
    urgent: int | None = 0,
    status: str | None = "Open",
    resp: str | None = "FSD",
    ted_status: str | None = None,
    category: str | None = None,
    parts_eta: str | None = None,
    on_hold: int | None = 0,
    quote_date: str | None = None,
    breakdown_end_date: str | None = None,
    ted: str | None = None,
    red: str | None = None,
    out_eta: str | None = None,
    is_the_machine_still_running: str | None = "No"
) -> Dict[str, Any]:
    """
    Create a new FT Breakdown Log.
    """
    if not machine or not description:
        return {"error": "Machine and Description are required"}

    try:
        # Validate Machine
        if not frappe.db.exists("FT Machine", machine):
            return {"error": f"Machine '{machine}' not found"}

        machine_doc = frappe.get_doc("FT Machine", machine)
        
        # Create Doc
        doc = frappe.new_doc("FT Breakdown Log")
        doc.machine = machine
        doc.description = description
        doc.breakdown_date = date or frappe.utils.nowdate()
        doc.urgent = 1 if urgent else 0
        doc.status = status or "Open"
        doc.resp = resp or "FSD"
        
        # New Fields
        if ted_status: doc.ted_status = ted_status
        if category: doc.category = category
        if parts_eta: doc.parts_eta = parts_eta
        if quote_date: doc.quote_date = quote_date
        if breakdown_end_date: doc.end_date = breakdown_end_date
        
        # System Alignment Fields
        if ted: doc.ted = ted
        if red: doc.red = red
        if out_eta: doc.out_eta = out_eta
        if is_the_machine_still_running: doc.is_the_machine_still_running = is_the_machine_still_running
        
        doc.on_hold = 1 if on_hold else 0
        
        # Auto-fill from Machine
        doc.customer = machine_doc.customer
        doc.model = machine_doc.model
        doc.location = machine_doc.location
        doc.region = machine_doc.region
        
        # Insert
        doc.insert(ignore_permissions=True)
        
        return {"ok": True, "name": doc.name}

    except Exception as e:
        frappe.log_error("Create Breakdown Failed", str(e))
        return {"error": str(e)}




@frappe.whitelist()
def get_breakdown_categories():
    """
    Fetch all FT BD Category names, sorted alphabetically.
    """
    try:
        categories = frappe.get_all("FT BD Category", fields=["name"], order_by="name asc")
        return [c.name for c in categories]
    except Exception as e:
        frappe.log_error(f"Error fetching breakdown categories: {str(e)}")
        return []


@frappe.whitelist(allow_guest=True)
def get_ft_machine_detail(name):
    """
    Get full machine details for the modal.
    Bypasses read permissions.
    """
    if not name:
        return {"error": "Missing name"}
        
    try:
        # Check permissions explicitly or ignore them depending on safety
        # Since this is a dashboard for internal users who might be Guests
        # we treat it read-only for the machine detail.
        doc = frappe.get_doc("FT Machine", name)
        return doc.as_dict()
    except Exception as e:
        return {"error": str(e)}

# ---------------------------------------------------------------------------
# Field Service Planning (FSP)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def add_ft_service_plan_entry(machine, description=None, planned_date=None, technician=None, defects=None, warranty_status=None, location=None):
    """
    Create a new Field Service Plan for a machine.
    """
    try:
        if not machine:
            return {"status": "error", "message": "Machine is required"}

        # Use Direct SQL to read machine data
        # Corrected columns: 'location' instead of 'site_name'/'current_location'
        mach_data = frappe.db.sql("""
            SELECT customer, location, warranty_status
            FROM `tabFT Machine`
            WHERE name = %s
        """, (machine,), as_dict=True)
        
        if not mach_data:
            return {"status": "error", "message": "Machine not found"}
            
        mach_doc = mach_data[0]
        
        new_fsi = frappe.new_doc("FT Field Service Plan")
        new_fsi.machine = machine
        new_fsi.customer = mach_doc.get("customer")
        new_fsi.location = location or mach_doc.get("location")
        new_fsi.description = description or "Service/Repair"
        new_fsi.scheduled_date = planned_date or frappe.utils.today()
        new_fsi.status = "Proposed"
        new_fsi.technician = technician
        new_fsi.defects = defects
        new_fsi.warranty_status = warranty_status or mach_doc.get("warranty_status")
        
        new_fsi.flags.ignore_permissions = True
        new_fsi.insert(ignore_permissions=True)
        
        return {"status": "success", "message": f"Added {machine} to plan", "name": new_fsi.name}
    except Exception as e:
        frappe.log_error(f"FSP Add Error: {str(e)}")
        if "Permission" in str(e):
             return {"status": "error", "message": "Permission Error on Write. Please contact admin."}
        return {"status": "error", "message": str(e)}

@frappe.whitelist(allow_guest=True)
def update_ft_service_plan_entry(name, technician=None, scheduled_date=None, defects=None, status=None, location=None, description=None):
    """
    Update an existing Field Service Plan.
    """
    try:
        if not name:
            return {"status": "error", "message": "Record Name is required"}
            
        doc = frappe.get_doc("FT Field Service Plan", name)
        if technician: doc.technician = technician
        if scheduled_date: doc.scheduled_date = scheduled_date
        if defects: doc.defects = defects
        if status: doc.status = status
        if location: doc.location = location
        if description: doc.description = description
        
        doc.flags.ignore_permissions = True
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {"status": "success", "message": f"Updated {name}"}
    except Exception as e:
        frappe.log_error(f"FSP Update Error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ---------------------------------------------------------------------------
# Report Archiving & Digital Signatures
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def archive_signed_report(type="DBR", title=None, region="Unknown", signatories="", content_b64=None):
    """
    Save a signed PDF report to the system as an archived file.
    """
    try:
        from frappe.utils.file_manager import save_file
        import base64

        if not content_b64:
            return {"status": "error", "message": "Missing PDF content"}

        # 1. Create a unique filename
        stamp = frappe.utils.now().replace(" ", "_").replace(":", "-")
        safe_type = (type or "DBR").replace(" ", "_")
        safe_region = (region or "Unknown").replace(" ", "_")
        filename = f"{safe_type}_{safe_region}_{stamp}.pdf"

        # 2. Decode content
        decoded_content = base64.b64decode(content_b64)

        # 3. Save as a Frappe File (Unattached to any specific record)
        file_doc = save_file(
            filename, 
            decoded_content, 
            None, # dt: No parent doctype
            None, # dn: No parent docname
            folder="Home",
            is_private=0, # Set to public so it's visible in the dashboard
            decode=False
        )

        # 4. Metadata-in-Filename Strategy (Resolves missing 'description' column issues)
        display_title = title or f"{type}_{region}_{frappe.utils.today()}"
        # Sanitize metadata for filename (remove | and other problematic chars)
        safe_type = type.replace(" ", "_")
        safe_region = region.replace(" ", "_")
        safe_signs = signatories.replace(" ", "_").replace(",", "-")
        safe_title = display_title.replace(" ", "_").replace("/", "-")
        
        # 4. Region-Based Filename Strategy (e.g., DBR_South__Metadata.pdf)
        safe_region = region.replace(" Region", "").replace(" ", "_")
        safe_type = type.replace(" ", "_")
        safe_signs = signatories.replace(" ", "_").replace(",", "-")
        safe_title = (title or f"{type}_{region}").replace(" ", "_").replace("/", "-")
        
        # New pattern: DBR_[Region]__[Type]__[Signatories]__[Title].pdf
        metadata_filename = f"DBR_{safe_region}__{safe_type}__{safe_signs}__{safe_title}.pdf"

        # Update the filename before returning
        file_doc.file_name = metadata_filename
        file_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": "Report archived successfully",
            "file_url": file_doc.file_url,
            "name": file_doc.name
        }
    except Exception as e:
        frappe.log_error(f"Archive Signed Report Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist(allow_guest=True)
def get_signed_reports(type=None):
    """
    Fetch list of archived signed reports from the File doctype.
    """
    try:
        # Handle 'All Types' or empty filter from frontend
        type_search = f"%|{type}|%" if type and type != "All Types" and type != "" else "%"
        
        # Search for files named DBR_[Region]__ metadata pattern
        query = """
            SELECT 
                name, file_name, file_url, creation
            FROM 
                `tabFile` 
            WHERE 
                file_name LIKE 'DBR_%%'
            ORDER BY 
                creation DESC
            LIMIT 100
        """
        
        files = frappe.db.sql(query, as_dict=1)

        processed = []
        for f in files:
            try:
                # Decode: DBR_Region__Type__Signs__Title.pdf
                raw_name = f.file_name.replace(".pdf", "")
                parts = raw_name.split("__")
                
                if len(parts) >= 4:
                    # parts[0] is DBR_Region
                    region_part = parts[0].replace("DBR_", "").replace("_", " ")
                    report_type = parts[1].replace("_", " ")
                    signatories = parts[2].replace("_", " ").replace("-", ", ")
                    title = parts[3].replace("_", " ").replace("-", "/")
                    region = region_part
                else:
                    report_type = "Breakdown Report"
                    region = "Unknown"
                    signatories = "—"
                    title = f.file_name

                # Filter by type if requested
                if type and type != "All Types" and type != "":
                    if type.lower() not in report_type.lower():
                        continue

                processed.append({
                    "name": f.name,
                    "file_name": f.file_name,
                    "file_url": f.file_url,
                    "creation": str(f.creation),
                    "report_type": report_type,
                    "region": region,
                    "signatories": signatories,
                    "title": title
                })
            except:
                continue
        
        return processed
    except Exception as e:
        frappe.log_error(f"Get Signed Reports Error: {str(e)}")
        return []

@frappe.whitelist(allow_guest=True)
def get_signed_report_pdf(name):
    """
    Retrieve the base64 content of an archived PDF.
    """
    try:
        import base64
        file_doc = frappe.get_doc("File", name)
        
        # Get content
        if file_doc.is_private:
            path = frappe.get_site_path("private", "files", file_doc.file_name)
        else:
            path = frappe.get_site_path("public", "files", file_doc.file_name)
            
        with open(path, "rb") as f:
            content = f.read()
            
        return {"base64": base64.b64encode(content).decode("utf-8")}
    except Exception as e:
        frappe.log_error(f"Get Signed Report PDF Error: {str(e)}")
        return {"error": str(e)}

@frappe.whitelist(allow_guest=True)
def get_ft_service_plan_list(region=None, customer=None, machine=None, status=None):
    """
    Get list of Field Service Plans for the dashboard.
    """
    try:
        conditions = ["1=1"]
        values = []

        if region:
            conditions.append("region LIKE %s")
            values.append(f"%{region}%")
        if customer:
            conditions.append("customer LIKE %s")
            values.append(f"%{customer}%")
        if machine:
            conditions.append("machine LIKE %s")
            values.append(f"%{machine}%")
        if status and status != "All Statuses":
            conditions.append("status = %s")
            values.append(status)

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT
                name, customer, machine, description, location,
                technician, defects, warranty_status, scheduled_date, status
            FROM `tabFT Field Service Plan`
            WHERE {where_clause}
            ORDER BY scheduled_date ASC
        """

        data = frappe.db.sql(query, tuple(values), as_dict=True)

        formatted = []
        for d in data:
            formatted.append({
                "name": d.name,
                "customer": d.customer,
                "machine": d.machine,
                "description": d.description,
                "location": d.location,
                "technician": d.technician,
                "defects": d.defects,
                "warranty_status": d.warranty_status,
                "plan_for": format_date_simple(d.scheduled_date) if d.scheduled_date else "",
                "raw_date": str(d.scheduled_date) if d.scheduled_date else "",
                "status": d.status
            })

        return formatted
    except Exception as e:
        frappe.log_error(f"FSP List Error: {str(e)}")
        return {"error": str(e)}


def format_date_simple(date_obj):
    if not date_obj: return ""
    return frappe.utils.format_date(date_obj, "dd.MMM")

@frappe.whitelist(allow_guest=True)
def get_technician_contact(technician_name):
    """
    Get the contact details (mobile number) for a specific technician.
    """
    if not technician_name:
        return {"status": "error", "message": "Technician name required"}
    
    try:
        # Attempt to get phone/mobile from the technician record
        # Common field names in Frappe/Omnis are mobile_no, cell_number, phone
        res = frappe.db.sql("""
            SELECT name, mobile_no, cell_number, phone
            FROM `tabFT Technician`
            WHERE name = %s
        """, (technician_name,), as_dict=True)
        
        if not res:
            return {"status": "error", "message": "Technician not found"}
        
        tech = res[0]
        # Priority for contact info: mobile_no > cell_number > phone
        contact = tech.get("mobile_no") or tech.get("cell_number") or tech.get("phone") or "No Contact"
        
        return {
            "status": "success",
            "name": tech.get("name"),
            "contact": contact
        }
    except Exception as e:
        frappe.log_error(f"FSP Get Tech Contact Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist(allow_guest=True)
def get_active_machine_defects(machine):
    """
    Fetch all active (non-Closed) defects for a specific machine.
    Used by FSP entry modal to allow technicians to 'tick' existing issues.
    """
    if not machine:
        return []
        
    try:
        defects = frappe.get_all("FT Defects Log", 
            filters={
                "machine": machine,
                "status": ["!=", "Closed"]
            },
            fields=["name", "defect_type", "description", "priority", "status"],
            order_by="creation desc",
            ignore_permissions=True
        )
        return defects
    except Exception as e:
        frappe.log_error(f"Error fetching machine defects: {str(e)}")
        return []

@frappe.whitelist(allow_guest=True)
def delete_ft_service_plan_entry(name):
    """
    Securely delete an FSP entry.
    """
    if not name:
        return {"status": "error", "message": "Name is required"}
    
    try:
        frappe.delete_doc("FT Field Service Plan", name, ignore_permissions=True)
        return {"status": "success", "message": f"Entry {name} deleted"}
    except Exception as e:
        frappe.log_error(f"FSP Delete Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist(allow_guest=True)
def submit_ft_hmr_log(machine, hmr, date=None, hmr_on_log=0, op_hours=0,
                      customer=None, model=None, telematics="No", payload=None):
    """
    Creates a new FT HMR Log entry and updates the Machine's current_hmr.
    Accepts either named parameters (preferred) or a JSON payload string.
    """
    try:
        # Support legacy JSON payload string
        if payload:
            import json
            if isinstance(payload, str):
                payload = json.loads(payload)
            machine    = payload.get("machine", machine)
            hmr        = payload.get("hmr", hmr)
            date       = payload.get("date", date)
            hmr_on_log = payload.get("hmr_on_log", hmr_on_log)
            op_hours   = payload.get("op_hours", op_hours)
            customer   = payload.get("customer", customer)
            model      = payload.get("model", model)
            telematics = payload.get("telematics", telematics)

        if not machine or not hmr:
            return {"status": "error", "message": "machine and hmr are required"}

        # Cast numerics
        hmr        = float(hmr)
        hmr_on_log = float(hmr_on_log or 0)
        op_hours   = float(op_hours or 0)

        log = frappe.get_doc({
            "doctype":   "FT HMR Log",
            "machine":   machine,
            "date":      date or frappe.utils.nowdate(),
            "hmr":       hmr,
            "hmr_on_log": hmr_on_log,
            "op_hours":  op_hours,
            "customer":  customer,
            "model":     model,
            "telematics": telematics,
        })
        log.insert(ignore_permissions=True)
        frappe.db.commit()

        # Update the parent Machine's current HMR
        if machine:
            frappe.db.set_value("FT Machine", machine, {"current_hmr": hmr}, update_modified=True)
            frappe.db.commit()

        return {"status": "success", "message": "HMR Log submitted successfully", "name": log.name}
    except Exception as e:
        frappe.log_error(f"Submit HMR Log Error: {str(e)}")
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# HMR Activity Report
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_hmr_activity_report(date_from=None, date_to=None, region=None, customer=None):
    """
    Return a summary of HMR updates per machine within a date range.
    Groups FT HMR Log entries by machine, counting total updates and tracking
    starting / ending HMR values, net change, last logger, and last update date.
    Joins FT Machine for model, customer, region, fleet_no, and sn.
    """
    try:
        if not date_from or not date_to:
            return {"error": "date_from and date_to are required"}

        conditions = ["DATE(h.creation) >= %s AND DATE(h.creation) <= %s"]
        values = [date_from, date_to]

        if region:
            conditions.append("m.region LIKE %s")
            values.append(f"%{region}%")
        if customer:
            conditions.append("m.customer LIKE %s")
            values.append(f"%{customer}%")

        where_clause = " AND ".join(conditions)

        rows = frappe.db.sql(f"""
            SELECT
                h.machine,
                m.model,
                m.sn,
                m.fleet_no,
                m.customer,
                m.region,
                COUNT(h.name)                          AS update_count,
                MIN(h.hmr)                             AS hmr_start,
                MAX(h.hmr)                             AS hmr_end,
                (MAX(h.hmr) - MIN(h.hmr))              AS hmr_change,
                MAX(DATE(h.creation))                  AS last_update_date,
                MIN(DATE(h.creation))                  AS first_update_date,
                GROUP_CONCAT(DISTINCT h.owner ORDER BY h.creation ASC SEPARATOR ', ') AS loggers
            FROM `tabFT HMR Log` h
            LEFT JOIN `tabFT Machine` m ON m.name = h.machine
            WHERE {where_clause}
            GROUP BY h.machine
            ORDER BY update_count DESC, m.customer ASC, h.machine ASC
        """, tuple(values), as_dict=True)

        result = []
        for r in rows:
            result.append({
                "machine":          r.machine,
                "model":            r.model or "—",
                "sn":               r.sn or r.machine,
                "fleet_no":         r.fleet_no or "—",
                "customer":         r.customer or "—",
                "region":           r.region or "—",
                "update_count":     int(r.update_count or 0),
                "hmr_start":        round(float(r.hmr_start), 0) if r.hmr_start is not None else None,
                "hmr_end":          round(float(r.hmr_end), 0) if r.hmr_end is not None else None,
                "hmr_change":       round(float(r.hmr_change), 0) if r.hmr_change is not None else None,
                "last_update_date": str(r.last_update_date) if r.last_update_date else "—",
                "first_update_date":str(r.first_update_date) if r.first_update_date else "—",
                "loggers":          r.loggers or "—",
            })

        return {
            "rows": result,
            "total_machines": len(result),
            "date_from": date_from,
            "date_to": date_to,
        }

    except Exception as e:
        frappe.log_error(f"HMR Activity Report Error: {str(e)}")
        return {"error": str(e)}
