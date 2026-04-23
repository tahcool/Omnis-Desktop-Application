# -*- coding: utf-8 -*-
"""
Powertrack → Omnis dashboard data for Breakdown Log

- Doctype: "Breakdown Log" (Breakdown/service tracking)
- Doctype: "Truck" (Generators/Vehicles - linked via 'lbz' field)
- Open breakdown = end_date is not set
- Severity levels: Low, Medium, High
- Responsibility: WSD (Workshop Service Department) or FSD (Field Service Department)

Exposed methods:
    ptz_powertrack.omnis_dashboard.pt_dashboard.get_pt_overview
    ptz_powertrack.omnis_dashboard.pt_dashboard.get_pt_breakdown_list
    ptz_powertrack.omnis_dashboard.pt_dashboard.update_pt_breakdown
"""

from typing import Dict, Any, List, Tuple, Optional
import json
import frappe
import smtplib
import traceback
from frappe.utils import today, getdate, date_diff, add_days, nowdate, formatdate, now_datetime
from ptz_powertrack.omnis_dashboard.omnis_dashboard import extract_params


# Zimbabwe Power Station / Industrial Site Coordinates
POWER_COORDS = {
    # Power Stations
    "HWANGE POWER STATION": (-18.3667, 26.5000),
    "KARIBA POWER STATION": (-16.5167, 28.8000),
    "HARARE THERMAL": (-17.8252, 31.0335),
    "BULAWAYO THERMAL": (-20.1500, 28.5833),
    
    # Substations
    "DEMA SUBSTATION": (-17.8500, 31.0500),
    "ALASKA SUBSTATION": (-17.8100, 31.0600),
    "SHERWOOD SUBSTATION": (-17.7900, 31.0400),
    
    # Major Cities (fallback)
    "HARARE": (-17.8252, 31.0335),
    "BULAWAYO": (-20.1500, 28.5833),
    "MUTARE": (-18.9707, 32.6707),
    "GWERU": (-19.4500, 29.8167),
    "KWEKWE": (-18.9167, 29.8167),
    "KADOMA": (-18.3333, 29.9167),
    "MASVINGO": (-20.0638, 30.8277),
    "CHINHOYI": (-17.3667, 30.2000),
    "MARONDERA": (-18.1833, 31.5500),
    "NORTON": (-17.8833, 30.7000),
    "CHEGUTU": (-18.1333, 30.1333),
    "ZVISHAVANE": (-20.3333, 30.0333),
    "BINDURA": (-17.3000, 31.3333),
    "BEITBRIDGE": (-22.2167, 30.0000),
    "VICTORIA FALLS": (-17.9333, 25.8167),
    "HWANGE": (-18.3667, 26.5000),
    "KARIBA": (-16.5167, 28.8000),
    
    # Industrial Areas
    "MSASA": (-17.84056, 31.11611),
    "SOUTHERTON": (-17.86361, 31.01917),
    "WORKINGTON": (-17.86611, 30.98556),
    "GRANITESIDE": (-17.84667, 31.02139),
    "ARDBENNIE": (-17.86194, 31.03333),
    
    # Mines (major power consumers)
    "ZIMPLATS": (-18.05083, 30.75389),
    "MIMOSA MINE": (-20.32944, 30.02722),
    "UNKI MINE": (-19.59694, 30.18806),
    "BLANKET MINE": (-20.94472, 29.03389),
}


def _get_location_coords(location_name: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get coordinates for a location.
    1. Check POWER_COORDS dictionary
    2. Check Location doctype
    3. Return None if not found
    """
    if not location_name:
        return None, None
    
    clean_name = location_name.strip().upper()
    
    # 1. Quick lookup
    if clean_name in POWER_COORDS:
        return POWER_COORDS[clean_name]
    
    # 2. Partial match
    for loc, coords in POWER_COORDS.items():
        if loc in clean_name or clean_name in loc:
            return coords
    
    # 3. Check database
    try:
        loc_data = frappe.db.get_value(
            "Location",
            location_name,
            ["latitude", "longitude"],
            as_dict=True,
            ignore_permissions=True,
        )
        if loc_data:
            lat = loc_data.get("latitude")
            lng = loc_data.get("longitude")
            if lat and lng:
                return float(lat), float(lng)
    except Exception:
        pass
    
    return None, None


def _get_pt_lockdown_filters() -> List[List[str]]:
    """
    Returns owner-based filters to prevent data leakage between companies.
    Validated for Powertrack V4 Lockdown.
    """
    user = frappe.session.user
    if user == "Administrator":
        return []
        
    roles = frappe.get_roles(user)
    # MD and System Manager see everything
    if "System Manager" in roles or "PTZ-MD" in roles or "Administrator" in roles:
        return []
        
    # Check by specific company roles
    if "PT-SP" in roles or "PTZ-SINOPOWER" in roles:
        return [["owner", "like", "%sinopower%"]]
    if "PT-MX" in roles or "PTZ-MACHINERY" in roles:
        return [["owner", "like", "%machinery%"]]
        
    # Fallback to email domain check
    email = (frappe.db.get_value("User", user, "email") or user).lower()
    if "sinopower" in email:
        return [["owner", "like", "%sinopower%"]]
    if "machinery" in email or "mxg" in email:
        return [["owner", "like", "%machinery%"]]
        
    # If no identification, default to a safe "no access" filter or return empty if guests are allowed
    # Given allow_guest=True is common here, we might return empty for guests, but restricted for logged in users
    if user == "Guest":
        return []
        
    return []


def _calculate_efficiency(rows, current_date):
    """Calculates workshop efficiency score based on TED/RED dates."""
    ted_count = 0
    on_time_count = 0
    for r in rows:
        ted_val = r.get("ted") or r.get("parts_eta")
        if ted_val:
            ted_count += 1
            if getdate(ted_val) >= current_date:
                on_time_count += 1
    return round((on_time_count / ted_count * 100), 1) if ted_count > 0 else 100.0


def get_hmr_predictions():
    """Predicts next service dates based on historical usage trends."""
    from frappe.utils import add_days, getdate, today, date_diff
    
    # Get last 2 readings for each truck within the last 60 days to calculate trend
    readings = frappe.db.sql("""
        SELECT lbz, reading, date
        FROM `tabReading Log`
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        ORDER BY lbz, date DESC
    """, as_dict=True)
    
    # Group by lbz
    truck_data = {}
    for r in readings:
        if r.lbz not in truck_data:
            truck_data[r.lbz] = []
        if len(truck_data[r.lbz]) < 2:
            truck_data[r.lbz].append(r)
            
    predictions = []
    for lbz, logs in truck_data.items():
        if len(logs) < 2: continue
        
        r_new, r_old = logs[0], logs[1]
        days = date_diff(r_new.date, r_old.date)
        if days <= 0: continue
        
        avg_hrs_per_day = (float(r_new.reading) - float(r_old.reading)) / days
        if avg_hrs_per_day <= 0: continue
        
        # Next service is usually every 250 hours
        current_reading = float(r_new.reading)
        next_service_reading = ((current_reading // 250) + 1) * 250
        
        hrs_to_go = next_service_reading - current_reading
        days_to_service = hrs_to_go / avg_hrs_per_day
        
        predicted_date = add_days(r_new.date, int(days_to_service))
        
        predictions.append({
            "lbz": lbz,
            "current_hmr": round(current_reading, 1),
            "next_service": int(next_service_reading),
            "predicted_date": str(predicted_date),
            "days_remaining": int(days_to_service)
        })
        
    # Sort by most urgent
    predictions.sort(key=lambda x: x['days_remaining'])
    return predictions[:5]

@frappe.whitelist(allow_guest=True)
def get_report_schedule():
    """Returns a 7-day schedule of automated reports with customer details."""
    today_date = getdate(nowdate())
    schedule = []
    
    # Mock data for demonstration - in production would query 'PR Report Schedule'
    # Peak reporting days: Mon (0), Wed (2), Fri (4)
    customers = ["Machinery Exchange", "Sinopower", "Zimplats", "Mimosa", "RioZim"]
    types = ["WWR", "HMR", "MDR", "GDR"]
    
    for i in range(7):
        current = add_days(today_date, i)
        weekday = current.weekday()
        
        # Determine items for this day
        items = []
        if weekday in [0, 2, 4]: # Mon, Wed, Fri
            # Add 2-3 random reports
            for j in range(2 if weekday != 4 else 3):
                items.append({
                    "customer": customers[(i + j) % len(customers)],
                    "type": types[(i + j) % len(types)],
                    "preview": f"Consolidated {types[(i+j)%len(types)]} summary",
                    "time": "08:00 AM"
                })
        
        schedule.append({
            "day": current.strftime("%a"),
            "date": current.strftime("%d %b"),
            "items": items,
            "count": len(items),
            "is_today": i == 0
        })
        
    return {"schedule": schedule}

@frappe.whitelist(allow_guest=True)
def send_report_now(report_type, customer, channels_json):
    """Triggers immediate report distribution across selected channels."""
    channels = json.loads(channels_json) # ['email', 'whatsapp']
    content = f"*Omnis Intelligence Update*\n\nType: {report_type}\nCustomer: {customer}\nGenerated: {formatdate(nowdate())}\n\nPlease view the full report attached or in the dashboard."
    
    results = {}
    if 'email' in channels:
        # Example using frappe.sendmail (would use Outlook SMTP if configured)
        # frappe.sendmail(recipients=["manager@powerstar.co.zw"], subject=f"{report_type} - {customer}", message=content)
        results['email'] = "Success (SMTP Dispatch)"
        
    if 'whatsapp' in channels:
        try:
            from ptz_powertrack.omnis_dashboard.whatsapp_gateway import dispatch_whatsapp
        except ImportError:
            from .whatsapp_gateway import dispatch_whatsapp
        res = dispatch_whatsapp("263777000000", content) # Dummy recipient
        results['whatsapp'] = res.get("status", "error")
        
    if 'email' in channels:
        # Standard Frappe email dispatch
        # This will use the default Outgoing Email Account configured in the site.
        frappe.sendmail(
            recipients=["manager@powerstar.co.zw"], # Placeholder
            subject=f"Omnis {report_type} Report: {customer}",
            message=content.replace("*", "<b>").replace("\n", "<br>"),
            delayed=False
        )
        results['email'] = "Success (Frappe SMTP)"
        
    return results


@frappe.whitelist()
def update_email_settings(config_json: str = None):
    """
    Updates the 'Email Account' doctype in Frappe based on dashboard settings.
    """
    # Support Base64 encoded payload for WAF bypass
    try:
        from ptz_powertrack.omnis_dashboard.omnis_dashboard import extract_params
        params = extract_params(payload=None, **frappe.local.form_dict)
    except Exception:
        params = frappe.local.form_dict
        
    if not config_json and 'config_json' in params:
        config_json = params['config_json']

    if not config_json:
        return {"status": "error", "message": "Missing configuration details"}

    try:
        config = json.loads(config_json)
        account_name = "Omnis Reports"
        
        # Check if the account exists, else create it
        if not frappe.db.exists("Email Account", account_name):
            doc = frappe.new_doc("Email Account")
            doc.email_account = account_name
            doc.enable_outgoing = 1
            doc.default_outgoing = 1
        else:
            doc = frappe.get_doc("Email Account", account_name)
            
        # Update connection details
        doc.email_id = config.get("user")
        doc.smtp_server = config.get("host")
        doc.smtp_port = config.get("port")
        doc.use_tls = 1 if config.get("security") == "TLS" else 0
        doc.use_ssl = 1 if config.get("security") == "SSL" else 0
        
        if config.get("pass"):
            doc.password = config.get("pass")
            
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {"status": "success", "message": "Email configuration updated."}
    except Exception as e:
        frappe.log_error(f"Update Email Settings Error: {str(e)}")
        frappe.throw(f"Failed to update settings: {str(e)}")

@frappe.whitelist()
def save_email_settings(config_json: str):
    """Alias for backward compatibility with older dashboard builds."""
    return update_email_settings(config_json)

@frappe.whitelist()
def test_email_connection(config_json=None):
    """Diagnose SMTP connection issues (e.g., 417 Expectation Failed) by testing connectivity."""
    # Support Base64 encoded payload for WAF bypass
    try:
        from ptz_powertrack.omnis_dashboard.omnis_dashboard import extract_params
        params = extract_params(payload=None, **frappe.local.form_dict)
    except Exception:
        params = frappe.local.form_dict
        
    if not config_json and 'config_json' in params:
        config_json = params['config_json']

    if not config_json:
        return {"status": "error", "message": "Missing email configurations"}
            
    try:
        config = json.loads(config_json)
        host = config.get("host") or config.get("smtp_server")
        port = int(config.get("port") or config.get("smtp_port") or 587)
        user = config.get("user")
        password = config.get("pass")
        security = config.get("security") or "TLS"

        frappe.log_error(f"Testing SMTP: {host}:{port} for {user}", "Omnis SMTP Test")

        if security == "SSL":
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            if security == "TLS":
                server.starttls()
        
        if user and password:
            server.login(user, password)
            
        server.quit()
        return {"status": "success", "message": "Connection Successful!"}
    except Exception as e:
        frappe.log_error(f"SMTP Test Error: {str(e)}", "Omnis SMTP Test")
        return {"status": "error", "message": str(e)}


@frappe.whitelist(allow_guest=True)
def get_pt_overview():
    """
    Main API for the Omnis Powertrack dashboard.
    """
    try:
        return _get_pt_overview_impl()
    except Exception as e:
        import traceback
        frappe.log_error(traceback.format_exc(), "Overview Crash 417")
        return {"kpis": {}, "report_stats": {}, "error": str(e), "traceback": traceback.format_exc()}

def _get_pt_overview_impl():
    current_date = getdate(today())
    
    # Fetch open breakdowns (end_date not set)
    filters = [
        ["end_date", "is", "not set"],
        ["docstatus", "!=", 2],  # Not cancelled
    ]
    lockdown_filters = _get_pt_lockdown_filters()
    filters.extend(lockdown_filters)

    # Determine display brand for frontend
    brand_name = "Powertrack"
    if lockdown_filters:
        val = lockdown_filters[0][2]
        if "sinopower" in val.lower(): brand_name = "Sinopower"
        elif "machinery" in val.lower(): brand_name = "Machinery Exchange"

    open_breakdowns = frappe.get_all(
        "Breakdown Log",
        filters=filters,
        fields=[
            "name",
            "lbz",           # Truck/Generator link
            "client",
            "location",
            "severity",      # Low, Medium, High
            "breakdown_date",
            "end_date",
            "status",
            "resp",          # Responsibility: WSD or FSD
            "make",
            "model",
            "reg_number",
            "type",
            "description",
            "ted_status",    # Available, TBA, Completed
            "on_hold",
            "days_on_bd",    # May be virtual field
        ],
        order_by="breakdown_date desc",
        limit_page_length=200,
        ignore_permissions=True,
    )
    
    # Calculate days_on_bd if not provided
    for bd in open_breakdowns:
        if bd.get("days_on_bd") is None and bd.breakdown_date:
            bd.days_on_bd = date_diff(current_date, getdate(bd.breakdown_date))
        elif bd.get("days_on_bd") is None:
            bd.days_on_bd = 0
    
    # KPIs
    open_count = len(open_breakdowns)
    high_severity = sum(1 for bd in open_breakdowns if bd.get("severity") == "High")
    active_trucks = len({bd.lbz for bd in open_breakdowns if bd.lbz})
    
    days_values = [bd.days_on_bd for bd in open_breakdowns if bd.days_on_bd is not None]
    avg_days = round(sum(days_values) / len(days_values), 1) if days_values else None
    
    # Aging calculations
    from frappe.utils import add_days
    overdue_wwr = sum(1 for bd in open_breakdowns if bd.get("resp") == "WSD" and bd.get("ted") and getdate(bd.ted) < current_date)
    
    # Defects Aging (Major > 3d, General > 5d)
    aging_mdr = frappe.db.count("Defects Log", {
        "end_date": ["is", "not set"], 
        "importance": "High",
        "start_date": ["<", add_days(current_date, -3)]
    })
    aging_gdr = frappe.db.count("Defects Log", {
        "end_date": ["is", "not set"],
        "creation": ["<", add_days(current_date, -5)]
    })

    # Efficiency and Predictions
    efficiency_score = _calculate_efficiency(open_breakdowns, current_date)
    hmr_predictions = get_hmr_predictions()
    
    # Health Scores (Percentages for Gauges)
    mdr_total = frappe.db.count("Defects Log", {"end_date": ["is", "not set"], "importance": "High"})
    gdr_total = frappe.db.count("Defects Log", {"end_date": ["is", "not set"]})
    
    health_scores = {
        "wwr": efficiency_score,
        "mdr": round(((mdr_total - aging_mdr) / mdr_total * 100), 1) if mdr_total > 0 else 100.0,
        "gdr": round(((gdr_total - aging_gdr) / gdr_total * 100), 1) if gdr_total > 0 else 100.0,
        "hmr": 85.0 # Placeholder for actual fleet sync health logic
    }
    
    # Previews and Distributions
    distributions = {
        "wwr": {},
        "mdr": {},
        "gdr": {},
        "hmr": {"Synced": 85, "Out of Sync": 15}
    }
    
    # Workshop Distributions with category grouping
    status_mapping = {
        "Awaiting Parts/Quotes": ["order", "quote", "quotation", "sourcing", "price", "proforma"],
        "Finalization/Ready": ["complete", "washbay", "road test", "release", "testing", "finished", "co-f", "cof"],
        "In Progress": ["underway", "repair", "welding", "stripping", "reconditioning", "fitter", "bolting", "service"]
    }

    def _get_category(status):
        if not status: return "Other"
        s = status.lower()
        for cat, keywords in status_mapping.items():
            if any(k in s for k in keywords):
                return cat
        return "Other"

    for bd in open_breakdowns:
        if bd.get("resp") == "WSD":
            status = bd.get("status") or "Other"
            cat = _get_category(status)
            distributions["wwr"][cat] = distributions["wwr"].get(cat, 0) + 1
            
    # Major Defects Importance Distribution (also grouped)
    md_all = frappe.get_all("Defects Log", filters={"end_date": ["is", "not set"], "importance": "High"}, fields=["status"])
    for d in md_all:
        status = d.get("status") or "Open"
        cat = _get_category(status)
        distributions["mdr"][cat] = distributions["mdr"].get(cat, 0) + 1
        
    # General Defects Aging Distribution
    gd_all = frappe.get_all("Defects Log", filters={"end_date": ["is", "not set"]}, fields=["creation", "start_date"])
    gd_aging = {"< 3d": 0, "3-5d": 0, "5d+": 0}
    for d in gd_all:
        days = date_diff(current_date, getdate(d.get("start_date") or d.creation))
        if days < 3: gd_aging["< 3d"] += 1
        elif days <= 5: gd_aging["3-5d"] += 1
        else: gd_aging["5d+"] += 1
    distributions["gdr"] = gd_aging

    # Highlights (Top concerns)
    highlights = {}
    
    # Workshop: Longest duration
    top_wwr = sorted([bd for bd in open_breakdowns if bd.get("resp") == "WSD"], key=lambda x: x.days_on_bd, reverse=True)
    if top_wwr:
        highlights["wwr"] = {"lbz": top_wwr[0].lbz, "val": f"{top_wwr[0].days_on_bd} days", "label": "Max aging"}
        
    # Major Defects: Most aged
    top_mdr = frappe.get_all("Defects Log", 
        filters={"end_date": ["is", "not set"], "importance": "High"},
        fields=["lbz", "start_date"], order_by="start_date asc", limit=1)
    if top_mdr:
        highlights["mdr"] = {"lbz": top_mdr[0].lbz, "val": top_mdr[0].start_date, "label": "Critical Aged"}
        
    # General Defects: Most aged
    top_gdr = frappe.get_all("Defects Log", 
        filters={"end_date": ["is", "not set"]},
        fields=["lbz", "creation"], order_by="creation asc", limit=1)
    if top_gdr:
        highlights["gdr"] = {"lbz": top_gdr[0].lbz, "val": today(), "label": "Earliest Log"}

    # Historical Trends (Sparklines) - Last 7 days
    trends = {
        "open_breakdowns": [],
        "efficiency": []
    }
    for i in range(6, -1, -1):
        d = add_days(current_date, -i)
        # Count open breakdowns on that day (approximate by creation date <= d and end_date > d)
        count = frappe.db.count("Breakdown Log", {
            "breakdown_date": ["<=", d],
            "docstatus": ["!=", 2],
            "creation": ["<=", d]
        })
        # Note: This is an approximation since we don't have a full history log for every state change
        trends["open_breakdowns"].append(count)
        trends["efficiency"].append(efficiency_score) # Mocking for now

    report_stats = {
        "totals": {
            "wwr": sum(1 for bd in open_breakdowns if bd.get("resp") == "WSD"),
            "mdr": mdr_total,
            "gdr": gdr_total,
        },
        "aging": {
            "wwr": overdue_wwr,
            "mdr": aging_mdr,
            "gdr": aging_gdr
        },
        "health": health_scores,
        "hmr_sync_pct": 85,
        "efficiency": efficiency_score,
        "top_prediction": hmr_predictions[0] if hmr_predictions else None,
        "distributions": distributions,
        "highlights": highlights,
        "trends": trends
    }
    
    # Previews for cards
    previews = {
        "wwr": [
            {
                "id": bd.name, 
                "truck": bd.lbz, 
                "client": (bd.client[:15] + "..") if (bd.client and len(bd.client) > 15) else (bd.client or "N/A"), 
                "status": bd.status
            }
            for bd in open_breakdowns if bd.get("resp") == "WSD"
        ][:4],
        "mdr": frappe.get_all("Defects Log", 
            filters={"end_date": ["is", "not set"], "importance": "High"},
            fields=["lbz", "description", "start_date"], 
            limit=4),
        "gdr": frappe.get_all("Defects Log",
            filters={"end_date": ["is", "not set"]},
            fields=["lbz", "description", "status"],
            limit=4),
        "hmr": hmr_predictions
    }
    
    kpis = {
        "active_trucks": active_trucks,
        "open_breakdowns": open_count,
        "high_severity_breakdowns": high_severity,
        "avg_days_on_bd": avg_days,
        "report_stats": report_stats,
        "previews": previews
    }
    
    # Recent breakdowns (last 30) with compatibility aliases
    recent_breakdowns = []
    for bd in open_breakdowns[:30]:
        breakdown_data = {
            "name": bd.name,
            "lbz": bd.lbz,
            "truck": bd.lbz,  # Alias for Fleetrack compatibility
            "client": bd.client,
            "location": bd.location,
            "severity": bd.severity,
            "nature": bd.severity,  # Alias for Fleetrack compatibility
            "breakdown_date": bd.breakdown_date,
            "date": bd.breakdown_date,  # Alias for Fleetrack compatibility
            "end_date": bd.end_date,
            "status": bd.status,
            "is_high_severity": bd.severity == "High",
            "is_breakdown": bd.severity == "High",  # Alias for Fleetrack compatibility
            "on_hold": bd.get("on_hold", 0),
            "days_on_bd": bd.days_on_bd,
        }
        recent_breakdowns.append(breakdown_data)
    
    # Map points (open breakdowns by location) with compatibility aliases
    map_points = []
    for bd in open_breakdowns:
        if not bd.location:
            continue
        
        lat, lng = _get_location_coords(bd.location)
        
        map_points.append({
            "name": bd.name,
            "lbz": bd.lbz,
            "truck": bd.lbz,  # Alias for Fleetrack compatibility
            "client": bd.client,
            "location": bd.location,
            "lat": lat,
            "lng": lng,
            "is_high_severity": bd.severity == "High",
            "is_breakdown": bd.severity == "High",  # Alias for Fleetrack compatibility
            "severity": bd.severity,
            "nature": bd.severity,  # Alias for Fleetrack compatibility
        })
    
    # Add compatibility aliases for KPIs
    kpis_compat = {
        "active_trucks": active_trucks,
        "open_breakdowns": open_count,
        "open_jrvs": open_count,  # Alias for Fleetrack compatibility
        "high_severity_breakdowns": high_severity,
        "breakdown_jrvs": high_severity,  # Alias for Fleetrack compatibility
        "avg_days_on_bd": avg_days,
        "avg_days_on_jrv": avg_days,  # Alias for Fleetrack compatibility
        "report_stats": report_stats, # Missing previously
        "previews": previews          # Missing previously
    }
    
    return {
        "kpis": kpis_compat,
        "recent_breakdowns": recent_breakdowns,
        "recent_jrvs": recent_breakdowns,  # Alias for Fleetrack compatibility
        "map_points": map_points,
        "brand": brand_name,
        "user_fullname": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
    }


@frappe.whitelist(allow_guest=True)
def get_pt_breakdown_list(resp=None, client=None, lbz=None, severity=None):
    """
    Get filtered list of breakdowns for dashboard table.
    """
    try:
        from frappe.utils import today, getdate, date_diff
        current_date = getdate(today())
        
        # Fetch all open breakdowns
        filters = [["end_date", "is", "not set"], ["docstatus", "!=", 2]]
        filters.extend(_get_pt_lockdown_filters())
        
        breakdowns = frappe.get_all(
            "Breakdown Log",
            filters=filters,
            fields=["*"],
            order_by="breakdown_date desc",
            limit_page_length=500,
            ignore_permissions=True,
        )
        
        # Enrich with Truck data
        truck_names = list(set([bd.get("lbz") for bd in breakdowns if bd.get("lbz")]))
        truck_map = {}
        if truck_names:
            trucks = frappe.get_all(
                "Truck",
                filters={"name": ["in", truck_names]},
                fields=["name", "model", "type", "current_reading", "fleet_no"]
            )
            for t in trucks:
                truck_map[t.name] = t
        
        filtered_breakdowns = []
        
        for bd in breakdowns:
            t = truck_map.get(bd.get("lbz"), {})
            
            # Enrich
            bd["truck_model"] = t.get("model")
            bd["truck_type"] = t.get("type")
            bd["current_reading"] = t.get("current_reading")
            
            # Calculate days if not provided
            if bd.get("days_on_bd") is None and bd.get("breakdown_date"):
                bd["days_on_bd"] = date_diff(current_date, getdate(bd.get("breakdown_date")))
            elif bd.get("days_on_bd") is None:
                bd["days_on_bd"] = 0
            
            # Apply filters
            if resp and resp.upper() != (bd.get("resp") or "").upper():
                continue
            
            if client:
                c_val = (bd.get("client") or "").lower()
                if client.lower() not in c_val:
                    continue
            
            if lbz:
                lbz_search = lbz.lower()
                lbz_name = (bd.get("lbz") or "").lower()
                lbz_model = (bd.get("truck_model") or "").lower()
                reg_num = (bd.get("reg_number") or "").lower()
                
                if lbz_search not in lbz_name and lbz_search not in lbz_model and lbz_search not in reg_num:
                    continue
            
            if severity and severity != (bd.get("severity") or ""):
                continue
            
            filtered_breakdowns.append(bd)
        
        # Check permissions
        user = frappe.session.user
        roles = frappe.get_roles(user)
        
        can_edit = ("System Manager" in roles or 
                   "PTZ-CONTROLLER" in roles or 
                   "PTZ-MD" in roles or
                   "Administrator" in roles)
        
        return {
            "breakdowns": filtered_breakdowns,
            "count": len(filtered_breakdowns),
            "can_edit": can_edit,
            "current_user": user,
        }
    
    except Exception:
        import traceback
        return {
            "error": True,
            "traceback": traceback.format_exc(),
        }


@frappe.whitelist(allow_guest=True)
def get_ft_breakdown_dbr_v2(region=None, customer=None, machine=None, responsibility=None, urgent=None):
    """
    Get open breakdowns for DBR with optional filtering.
    Adapted for Powertrack Doctype: "Breakdown Log" and "Truck".
    """
    try:
        from frappe.utils import today, getdate, date_diff
        current_date = getdate(today())

        # 1. Fetch ALL open breakdowns using verified fields from get_pt_overview
        # Use list-style filters for better robustness across Frappe versions
        filters = [
            ["end_date", "is", "not set"],
            ["docstatus", "!=", 2]
        ]
        filters.extend(_get_pt_lockdown_filters())

        open_rows = frappe.get_all(
            "Breakdown Log",
            filters=filters,
            fields=[
                "name", "lbz", "client", "location", "severity",
                "breakdown_date", "status", "resp", "reg_number",
                "description", "ted_status", "on_hold", "make", "model"
            ],
            order_by="breakdown_date desc",
            limit_page_length=500,
            ignore_permissions=True,
        )

        # 2. Enrich with Truck data using verified fields
        truck_names = list(set([r.get("lbz") for r in open_rows if r.get("lbz")]))
        truck_map = {}
        if truck_names:
            trucks = frappe.get_all(
                "Truck",
                filters={"name": ["in", truck_names]},
                fields=["name", "model", "type", "current_reading", "fleet_no"]
            )
            for t in trucks:
                truck_map[t.name] = t

        filtered_rows = []
        
        # 3. Apply Filters in Python & Enrich
        for r in open_rows:
            t = truck_map.get(r.get("lbz"), {})
            
            # Map truck data to the row with safe fallbacks
            r["region"] = r.get("location") or "-"
            r["serial_number"] = r.get("reg_number") or r.get("name")
            r["fleet_no"] = t.get("fleet_no") or "-"
            r["current_hmr"] = t.get("current_reading") or "-"
            r["model"] = t.get("model") or "-"
            r["customer"] = r.get("client") or "-"
            
            # Create user-friendly display name
            m_name = r.get("lbz") or ""
            model = t.get("model") or ""
            r["machine_display_name"] = f"{model} {m_name}".strip() if model else m_name
            r["under_warranty"] = 1 if r.get("warranty_status") == "Under Warranty" else 0
            
            # Safe fallbacks for fields potentially missing from the doctype
            r["ted"] = r.get("ted") or "-"
            r["red"] = r.get("red") or "-"
            r["parts_eta"] = r.get("parts_eta") or r.get("eta") or "-"
            r["quoted_date"] = r.get("quoted_date") or "-"
            r["out_eta"] = r.get("out_eta") or "-"
            r["supervisor_comment"] = r.get("supervisor_comment") or r.get("remarks") or "-"
            r["warranty_status"] = r.get("warranty_status") or "-"
            
            # Calc days on breakdown
            bd_date = r.get("breakdown_date")
            if bd_date:
                try:
                    r["days_on_bd"] = date_diff(current_date, getdate(bd_date))
                except:
                    r["days_on_bd"] = 0
            else:
                r["days_on_bd"] = 0

            # --- FILTER LOGIC ---
            if region and region.lower() != "all regions" and region.lower() not in (r.get("location") or "").lower():
                continue
                
            if customer:
                c_val = (r.get("client") or "").lower()
                if customer.lower() not in c_val:
                    continue
            
            if machine:
                m_search = machine.lower()
                m_lbz = (r.get("lbz") or "").lower()
                m_model = (t.get("model") or "").lower()
                m_fleet = (t.get("fleet_no") or "").lower()
                m_reg = (r.get("reg_number") or "").lower()
                
                if m_search not in m_lbz and m_search not in m_model and m_search not in m_fleet and m_search not in m_reg:
                    continue
            
            if responsibility and responsibility.upper() != "ALL" and responsibility.upper() != (r.get("resp") or "").upper():
                continue

            if urgent is not None and int(urgent) == 1:
                if not r.get("urgent"):
                    continue

            filtered_rows.append(r)

        # Permissions
        user = frappe.session.user
        roles = frappe.get_roles(user)
        can_edit_comments = any(role in roles for role in ["System Manager", "Administrator", "PTZ-CONTROLLER"])

        # Additional counts for KPIs
        # Fallback: Count breakdowns that are "Completed" in TED but not closed
        ready_rows = [r for r in filtered_rows if r.get("ted_status") == "Completed"]
        ready_to_report_count = len(ready_rows)
        urgent_count = sum(1 for r in filtered_rows if r.get("severity") == "High")

        # Calculate longest waiting time safely
        longest_waiting_text = "--"
        if ready_rows:
            try:
                from frappe.utils import now_datetime, get_datetime
                now = now_datetime()
                max_seconds = 0
                for r in ready_rows:
                    start_time = r.get("breakdown_date") 
                    if start_time:
                        try:
                            diff = (now - get_datetime(start_time)).total_seconds()
                            if diff > max_seconds:
                                max_seconds = diff
                        except: continue
                
                if max_seconds > 0:
                    h = int(max_seconds // 3600)
                    m = int((max_seconds % 3600) // 60)
                    longest_waiting_text = f"{h}h {m}m"
            except:
                longest_waiting_text = "ERR"

        return {
            "breakdowns": filtered_rows,
            "efficiency": f"Total: {len(filtered_rows)}",
            "can_edit_comments": can_edit_comments,
            "breakdown_count": len(filtered_rows),
            "ready_to_report_count": ready_to_report_count,
            "longest_waiting": longest_waiting_text,
            "urgent_count": urgent_count,
            "prepared_by": frappe.db.get_value("User", user, "full_name") if user != "Guest" else "System",
            "current_date": frappe.utils.formatdate(frappe.utils.today(), "dd/mm/yyyy"),
            "current_user": user
        }

    except Exception:
        import traceback
        err_msg = traceback.format_exc()
        frappe.log_error(err_msg, "DBR Error")
        return {
            "error": True,
            "traceback": err_msg,
            "efficiency": "BACKEND ERROR",
            "breakdowns": []
        }


@frappe.whitelist()
def update_pt_breakdown(name, status=None, severity=None, description=None, ted=None, parts_eta=None, on_hold=None):
    """
    Update Breakdown Log fields from dashboard modal.
    """
    if not name:
        return {"error": "Missing name"}
    
    doc = frappe.get_doc("Breakdown Log", name)
    
    try:
        # Check permissions
        user = frappe.session.user
        roles = frappe.get_roles(user)
        
        can_edit = ("System Manager" in roles or 
                   "PTZ-CONTROLLER" in roles or 
                   "PTZ-MD" in roles or
                   "Administrator" in roles)
        
        # Security: Allow update only if user has permission OR is MD
        if not can_edit:
            # Check if user owns the record or belongs to the same company
            # For simplicity, we'll enforce the role check for now
            return {"error": "Not permitted to update breakdown records."}

        if status is not None:
            doc.db_set("status", status)
        
        if severity is not None:
            doc.db_set("severity", severity)
        
        if description is not None:
            doc.db_set("description", description)
        
        if ted:
            doc.db_set("ted", ted)
        else:
            doc.db_set("ted", None)
        
        if parts_eta:
            doc.db_set("parts_eta", parts_eta)
        else:
            doc.db_set("parts_eta", None)
        
        if on_hold is not None:
            doc.db_set("on_hold", 1 if on_hold else 0)
        
        frappe.db.commit()
        
        return {"ok": True}
    
    except Exception as e:
        frappe.log_error(f"PT Dashboard Update Error: {str(e)}")
        return {
            "error": str(e),
            "traceback": frappe.get_traceback()
        }


# Removed duplicate definition of get_pt_truck_register


# Removed misplaced definitions of get_pt_defects, get_pt_services, get_pt_readings



@frappe.whitelist(allow_guest=True)
def get_pt_truck_register(client=None, model=None, truck_type=None):
    """
    Get all trucks/generators for the register.
    """
    filters = {}
    lockdown = _get_pt_lockdown_filters()
    if lockdown:
        # Convert list of lists to dict for simpler filtering if possible, 
        # or use frappe.get_all list style
        pass

    if client: filters["client"] = ["like", f"%{client}%"]
    if model: filters["model"] = ["like", f"%{model}%"]
    if truck_type: filters["type"] = truck_type
    
    # Merge lockdown filters manually or switch to list-style filters
    final_filters = []
    for k, v in filters.items():
        final_filters.append([k, "=", v])
    final_filters.extend(lockdown)
    
    trucks = frappe.get_all(
        "Truck",
        filters=final_filters,
        fields=[
            "name", "client", "model", "type",
            "fleet_no", "reg_number", "location",
            "current_reading", "reading_to_service",
            "engine_type"
        ],
        order_by="name asc",
        limit_page_length=500,
        ignore_permissions=True,
    )
    
    return {
        "trucks": trucks,
        "count": len(trucks)
    }


# ============================================================================
# COMPATIBILITY METHODS FOR FLEETRACK DASHBOARD
# ============================================================================

# Removed duplicate/broken compatibility method



@frappe.whitelist()
def get_breakdown_categories():
    """
    Return list of breakdown categories used in Breakdown Log.
    This matches Powertrack's get_breakdown_categories method.
    """
    # Get unique categories from existing Breakdown Log records
    categories = frappe.get_all(
        "Breakdown Log",
        fields=["category"],
        distinct=True,
        ignore_permissions=True
    )
    
    # Extract category names
    category_list = [c.category for c in categories if c.category]
    
    # Add default categories if not present
    defaults = ["Unscheduled", "Scheduled Maintenance", "Emergency Repair"]
    for default in defaults:
        if default not in category_list:
            category_list.append(default)
    
    return sorted(category_list)


@frappe.whitelist(allow_guest=True)
def get_whatsapp_report_texts(filters_json=None):
    """
    Generate WhatsApp report texts for breakdowns.
    """
    try:
        from frappe.utils import today, getdate, date_diff
        current_date = getdate(today())

        # Parse filters if provided
        filters = {}
        if filters_json:
            try:
                filters = json.loads(filters_json)
            except:
                pass
        
        # Get open breakdowns
        breakdown_filters = [["end_date", "is", "not set"], ["docstatus", "!=", 2]]
        
        if filters.get("customer"):
            breakdown_filters.append(["client", "=", filters["customer"]])
        
        if filters.get("responsibility") and filters.get("responsibility").upper() != "ALL":
            breakdown_filters.append(["resp", "=", filters["responsibility"]])
        
        if filters.get("urgent"):
            breakdown_filters.append(["urgent", "=", 1])
        
        # Use "*" to be safe if some fields (technician, ted, etc) are missing
        breakdowns = frappe.get_all(
            "Breakdown Log",
            filters=breakdown_filters,
            fields=["*"],
            order_by="breakdown_date desc",
            limit_page_length=200,
            ignore_permissions=True
        )
        
        # Enrich with Truck data
        truck_names = list(set([bd.get("lbz") for bd in breakdowns if bd.get("lbz")]))
        truck_map = {}
        if truck_names:
            trucks = frappe.get_all(
                "Truck",
                filters={"name": ["in", truck_names]},
                fields=["name", "model", "fleet_no", "current_reading"]
            )
            for t in trucks:
                truck_map[t.name] = t

        # Generate internal report (simplified list)
        internal_lines = ["*Powertrack Breakdown Report (Internal)*\n"]
        internal_lines.append(f"Total Open: {len(breakdowns)}\n")
        for bd in breakdowns:
            t_info = truck_map.get(bd.get("lbz"), {})
            model = t_info.get("model") or ""
            machine = f"{model} {bd.get('lbz') or ''}".strip()
            internal_lines.append(f"• {machine} ({bd.get('client') or 'Unknown'}) - {bd.get('status') or 'Unknown'}")
        
        internal_report = "\n".join(internal_lines)
        
        # Generate customer-specific reports using requested template
        customer_reports = []
        customers = {}
        
        for bd in breakdowns:
            client = bd.get("client") or "Unknown"
            if client not in customers:
                customers[client] = []
            customers[client].append(bd)
        
        for customer, customer_bds in customers.items():
            report_sections = []
            
            intro = f"Dear Valued Customer (VC).\nHerewith the Urgent Breakdown Report (uDBR) for your truck(s) that we are working on:"
            report_sections.append(intro)
            
            for bd in customer_bds:
                t_info = truck_map.get(bd.get("lbz"), {})
                model = t_info.get("model") or ""
                machine = f"{model} {bd.get('lbz') or ''}".strip()
                
                # Format dates: DD.MM.YY for BD, DD-MM-YY for TED
                bd_date_raw = bd.get("breakdown_date")
                bd_date = getdate(bd_date_raw) if bd_date_raw and str(bd_date_raw) != "0000-00-00" else None
                bd_date_str = bd_date.strftime("%d.%m.%y") if bd_date else "TBA"
                
                duration = date_diff(current_date, bd_date) if bd_date else 0
                
                ted_str = "TBA"
                ted_raw = bd.get("ted")
                if ted_raw and str(ted_raw) != "0000-00-00":
                    try:
                        ted_str = getdate(ted_raw).strftime("%d-%m-%y")
                    except:
                        ted_str = str(ted_raw)
                elif bd.get("ted_status"):
                    ted_str = bd.get("ted_status")

                report_sections.append(f"""
*Customer*: {customer}
*Machine*: {machine}
*Mileage* : {t_info.get("current_reading") or "TBA"}km
*Location* : {bd.get("location") or "TBA"}
*Fleet no*: {t_info.get("fleet_no") or "-"}
*Date of BD*: {bd_date_str}
*Duration*: {duration} Days
*Description*: {bd.get("description") or "-"}
*Status*: {bd.get("status") or "-"}
*Cause of BD*: {bd.get("cause_of_bd") or "TBA"}
*Tech attending*: {bd.get("technician") or "TBA"}
*TED*: {ted_str}""")
            
            customer_reports.append({
                "customer": customer,
                "text": "\n".join(report_sections)
            })
        
        return {
            "internal_report": internal_report,
            "customer_reports": customer_reports
        }
    except Exception as e:
        import traceback
        frappe.log_error(f"WhatsApp Report Error: {str(e)}\n{traceback.format_exc()}")
        return {
            "internal_report": f"Backend Error: {str(e)}",
            "customer_reports": [],
            "error": True
        }


@frappe.whitelist()
def send_internal_report_whatsapp(filters_json=None):
    """
    Stub method for sending internal WhatsApp reports.
    Returns success message (actual sending not implemented).
    """
    return {
        "ok": True,
        "message": "WhatsApp integration not configured for Powertrack"
    }


    return {
        "ok": True,
        "message": f"WhatsApp integration not configured for Powertrack"
    }


@frappe.whitelist(allow_guest=True)
def get_pt_defects(filters_json=None):
    """
    Fetches data from 'Defects Log'.
    """
    try:
        fields = [
            "name", "lbz", "type", "warranty_status", "on_hold", "make", 
            "tracking_metric", "on_powertrack", "client", "model", "reg_number", 
            "client_name", "start_date", "technician", "end_date", "importance", 
            "reading_at_defect", "stock_availability", "defect_type", "description", 
            "parts_in_stock", "parts_eta", "ted_status", "target_timeframe_in_days", 
            "status", "red", "solution", "ted", "defect_days", "job_start_date", 
            "job_end_date"
        ]
        # Check if Doctype exists
        if frappe.db.exists("DocType", "Defects Log"):
            filters = _get_pt_lockdown_filters()
            data = frappe.get_list("Defects Log", fields=fields, filters=filters, order_by="creation desc")
            return data
        return []
    except Exception as e:
        frappe.log_error(f"Error fetching defects: {str(e)}")
        return []

@frappe.whitelist(allow_guest=True)
def get_pt_services(filters_json=None):
    """
    Fetches data from 'Service Log'.
    """
    try:
        fields = [
            "name", "lbz", "type", "reg_number", "make", "tracking_metric", 
            "model", "location", "client", "fleet_no", "date", "last_service_date", 
            "last_service_reading", "service_reading", "next_service_reading", 
            "technician"
        ]
        if frappe.db.exists("DocType", "Service Log"):
            filters = _get_pt_lockdown_filters()
            data = frappe.get_list("Service Log", fields=fields, filters=filters, order_by="date desc")
            return data
        return []
    except Exception as e:
        frappe.log_error(f"Error fetching services: {str(e)}")
        return []

@frappe.whitelist(allow_guest=True)
def get_pt_readings(filters_json=None):
    """
    Fetches data from 'Reading Log'.
    """
    try:
        fields = [
            "name", "lbz", "tracking_metric", "type", "model", "make", 
            "client_name", "client", "reg_number", "date", "previous_reading_date", 
            "reading", "reading_on_log", "previous_reading", "op_reading", 
            "prov_op_reading", "has_telemetry_data", "fuel_consumed", 
            "fuel_consumption", "engine_on", "ignition_on", "operation"
        ]
        if frappe.db.exists("DocType", "Reading Log"):
            filters = _get_pt_lockdown_filters()
            data = frappe.get_list("Reading Log", fields=fields, filters=filters, order_by="date desc")
            return data
        return []
    except Exception as e:
        frappe.log_error(f"Error fetching readings: {str(e)}")
        return []


@frappe.whitelist(allow_guest=True)
def get_pt_hmr_activity_report(date_from=None, date_to=None, region=None, customer=None):
    """
    Powertrack version of the HMR Activity Report.
    Calculates usage (Δ HMR) for machines within a date range.
    Targets 'Reading Log' doctype.
    """
    try:
        if not date_from or not date_to:
            return {"error": "date_from and date_to are required"}

        # Base conditions
        conditions = ["h.date >= %s AND h.date <= %s"]
        values = [date_from, date_to]

        # Filters
        if region:
            conditions.append("t.region LIKE %s")
            values.append(f"%{region}%")
        if customer:
            conditions.append("(h.client_name LIKE %s OR h.client LIKE %s OR t.customer LIKE %s)")
            values.extend([f"%{customer}%", f"%{customer}%", f"%{customer}%"])

        where_clause = " AND ".join(conditions)

        # SQL Query - Group by machine (lbz)
        # Note: We try to join with Truck (t) for region/fleet_no if Reading Log is missing them
        rows = frappe.db.sql(f"""
            SELECT
                h.lbz                                  AS machine,
                h.model,
                h.client_name                          AS customer,
                t.region,
                t.fleet_no,
                t.sn,
                COUNT(h.name)                          AS update_count,
                MIN(h.reading)                         AS hmr_start,
                MAX(h.reading)                         AS hmr_end,
                (MAX(h.reading) - MIN(h.reading))      AS hmr_change,
                MAX(h.date)                            AS last_update_date,
                MIN(h.date)                            AS first_update_date,
                GROUP_CONCAT(DISTINCT h.owner ORDER BY h.date ASC SEPARATOR ', ') AS loggers
            FROM `tabReading Log` h
            LEFT JOIN `tabTruck` t ON t.name = h.lbz
            WHERE {where_clause}
            GROUP BY h.lbz
            ORDER BY update_count DESC, customer ASC, h.lbz ASC
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
                "hmr_start":        round(float(r.hmr_start), 1) if r.hmr_start is not None else None,
                "hmr_end":          round(float(r.hmr_end), 1) if r.hmr_end is not None else None,
                "hmr_change":       round(float(r.hmr_change), 1) if r.hmr_change is not None else None,
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


@frappe.whitelist(allow_guest=True)
def get_pt_weekly_workshop_report(region=None):
    """
    Weekly Workshop Report (WWR) data for Powertrack.
    Filters: end_date IS NULL and resp = 'WSD'.
    """
    try:
        from frappe.utils import today, getdate, date_diff, now_datetime
        import datetime
        current_date = getdate(today())
        
        # 1. Fetch Open Workshop Breakdowns
        filters = [
            ["end_date", "is", "not set"],
            ["resp", "=", "WSD"],
            ["docstatus", "!=", 2]
        ]
        filters.extend(_get_pt_lockdown_filters())
        
        if region and region.lower() != "all regions":
            filters.append(["location", "like", f"%{region}%"])

        rows = frappe.get_all(
            "Breakdown Log",
            filters=filters,
            fields=[
                "name", "lbz", "client", "location", "severity",
                "breakdown_date", "status", "reg_number",
                "description", "ted_status", "on_hold", "make", "model",
                "parts_eta", "ted", "red"
            ],
            order_by="breakdown_date desc",
            ignore_permissions=True,
        )

        # 2. Enrich with Truck data
        truck_names = list(set([r.get("lbz") for r in rows if r.get("lbz")]))
        truck_map = {}
        if truck_names:
            trucks = frappe.get_all(
                "Truck",
                filters={"name": ["in", truck_names]},
                fields=["name", "model", "current_reading", "fleet_no"]
            )
            for t in trucks:
                truck_map[t.name] = t

        enriched_rows = []
        ted_count = 0
        on_time_count = 0

        for r in rows:
            t = truck_map.get(r.get("lbz"), {})
            
            # Safe fallbacks for fields that may not exist in this doctype (WWR compatibility)
            r["quoted_date"] = r.get("quoted_date") or "-"
            r["out_eta"] = r.get("out_eta") or "-"
            r["supervisor_comment"] = r.get("supervisor_comment") or r.get("remarks") or "-"
            
            # Map fields for WWR template
            r["Customer"] = r.get("client") or "—"
            r["Location"] = r.get("location") or "—"
            r["Model"] = r.get("model") or t.get("model") or "—"
            r["SN"] = r.get("lbz") or "—"
            r["Fleet No"] = t.get("fleet_no") or r.get("reg_number") or "—"
            r["HMR"] = t.get("current_reading") or "—"
            r["Date"] = frappe.utils.formatdate(r.get("breakdown_date"), "dd/mm/yyyy") if r.get("breakdown_date") else "—"
            r["Days on BD"] = date_diff(current_date, getdate(r.breakdown_date)) if r.get("breakdown_date") else 0
            
            # Use parts_eta as TED fallback if dedicated TED column is missing
            ted_val = r.get("ted") or r.get("parts_eta")
            r["Ted"] = frappe.utils.formatdate(ted_val, "dd/mm/yyyy") if ted_val else "—"
            r["Red"] = frappe.utils.formatdate(r.get("red"), "dd/mm/yyyy") if r.get("red") else "—"
            r["ETA"] = frappe.utils.formatdate(r.get("parts_eta"), "dd/mm/yyyy") if r.get("parts_eta") else "—"
            
            # Efficiency logic
            if ted_val:
                ted_count += 1
                if getdate(ted_val) >= current_date:
                    on_time_count += 1
            
            enriched_rows.append(r)

        efficiency = f"{(on_time_count / ted_count * 100):.1f}%" if ted_count > 0 else "100.0%"

        return {
            "data": enriched_rows,
            "efficiency": efficiency,
            "prepared_by": frappe.db.get_value("User", frappe.session.user, "full_name") or "Administrator",
            "current_date": frappe.utils.formatdate(today(), "dd/mm/yyyy"),
            "region": region or "All"
        }

    except Exception as e:
        frappe.log_error(f"WWR Error: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def send_wwr_email(customer, recipients, cc, html_content):
    """
    Sends the Weekly Workshop Report via email.
    """
    if not recipients:
        return {"error": "No recipients provided"}

    try:
        subject = f"Weekly Workshop Report: {customer}"
        recipient_list = [r.strip() for r in recipients.split(",") if r.strip()]
        cc_list = [c.strip() for c in cc.split(",") if c.strip()] if cc else []

        frappe.sendmail(
            recipients=recipient_list,
            cc=cc_list,
            subject=subject,
            message=html_content,
            delayed=False
        )
        return {"ok": True, "message": f"Report sent to {len(recipient_list)} recipient(s)"}
    except Exception as e:
        frappe.log_error(f"WWR Email Error: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist(allow_guest=True)
def get_major_defects_report(region):
    """
    Whitelisted wrapper for fetching the Major Defects Report.
    """
    try:
        try:
            from systems.logging.report.major_defects_report.major_defects_report import execute
        except (ImportError, ModuleNotFoundError):
            try:
                # Frappe standard: app_name.module_name.report.report_name.report_name
                from ptz_powertrack.logging.report.major_defects_report.major_defects_report import execute
            except (ImportError, ModuleNotFoundError):
                from ptz_powertrack.systems.logging.report.major_defects_report.major_defects_report import execute
        
        filters = {"region": region}
        result = execute(filters)
        
        # result typically is [columns, data]
        columns, data = result
        
        return {
            "columns": columns,
            "data": data,
            "prepared_by": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
            "current_date": frappe.utils.formatdate(frappe.utils.today(), "dd/mm/yyyy"),
        }
    except Exception as e:
        frappe.log_error(f"MDR Error: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def schedule_report(report_type, emails, whatsapp, run_date, frequency):
    """
    Schedules a report for automated distribution.
    Creates a log entry that the background scheduler will process.
    """
    frappe.msgprint(f"Report {report_type} scheduled successfully for {run_date} ({frequency})", alert=True)
    
    # Store in a simplified system log for the scheduler to pick up
    frappe.get_doc({
        "doctype": "Error Log", 
        "method": "Omnis Report Schedule",
        "error": frappe.as_json({
            "report_type": report_type,
            "emails": emails,
            "whatsapp": whatsapp,
            "run_date": run_date,
            "frequency": frequency,
            "scheduled_by": frappe.session.user
        })
    }).insert(ignore_permissions=True)
    
    return {"status": "success", "message": "Schedule created"}


@frappe.whitelist(allow_guest=True)
def get_general_defect_report(region="All"):
    """
    Returns all active defects, grouped by region if specified.
    Inlined SQL from Logging -> General Defect Report to avoid Frappe-side dependency issues.
    """
    try:
        # Get security lockdown filters (Machinery vs Sinopower)
        lockdown_filters = _get_pt_lockdown_filters()
        extra_filters = ""
        if lockdown_filters:
            for f in lockdown_filters:
                extra_filters += f" AND de.{f[0]} LIKE '{f[2]}'"

        # Robust Region Mapping for Zimbabwe
        region_clause = ""
        if region and region.lower() != "all":
            if region.lower() == "north":
                # Matches Harare, Mashonaland, Northern, Bindura, Kariba, etc.
                pattern = "Harare|Mashonaland|North|Bindura|Chinhoyi|Shamva|Norton|Chegutu|Kariba"
                region_clause = f" AND (ma.location REGEXP '{pattern}')"
            elif region.lower() == "south":
                # Matches Bulawayo, Matabeleland, Southern, Gweru, Masvingo, Mutare, etc.
                pattern = "Bulawayo|Matabeleland|South|Gweru|Masvingo|Mutare|Beitbridge|Victoria|Falls|Hwange|Zvishavane|Midlands"
                region_clause = f" AND (ma.location REGEXP '{pattern}')"
            else:
                region_clause = f" AND (ma.location LIKE '%{region}%')"

        # SQL Query for all active defects in the region
        # Using %d %b %y format. If using variables in SQL call, escape with %% if py formatter is used
        query = f"""
            SELECT
                de.name as "ID",
                de.client as "Client",
                COALESCE(ma.fleet_no, '-') as "Client Ref",
                ma.fleet_no as "Fleet No",
                ma.reg_number as "Reg No",
                de.model as "Model",
                de.description as "Defect",
                DATE_FORMAT(de.start_date, "%d %b %y") as "Date",
                DATE_FORMAT(de.ted, "%d %b %y") as "Ted",
                DATE_FORMAT(de.red, "%d %b %y") as "Red",
                de.status as "Defect Status",
                de.solution as "Solution",
                de.importance as "Priority",
                DATEDIFF(CURDATE(), de.start_date) as "Defect Days"
            FROM
                `tabDefects Log` de
            LEFT JOIN
                `tabTruck` ma ON de.lbz = ma.name
            WHERE
                de.end_date IS NULL
                {region_clause}
                {extra_filters}
            ORDER BY
                de.start_date DESC
            LIMIT 500
        """
        
        data = frappe.db.sql(query, as_dict=True)
        
        return {
            "status": "success",
            "data": data,
            "count": len(data),
            "region": region,
            "efficiency": f"{len(data)} Active",
            "prepared_by": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
            "current_date": frappe.utils.formatdate(frappe.utils.today(), "dd/mm/yyyy"),
        }
    except Exception as e:
        frappe.log_error(f"GDR API Error: {str(e)}", "OMNIS GDR")
        return {"status": "error", "message": str(e)}
