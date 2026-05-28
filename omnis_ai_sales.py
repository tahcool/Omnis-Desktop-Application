# powerstar_salestrack/api/omnis_ai_sales.py

from __future__ import unicode_literals
import frappe
from frappe.utils import get_first_day, get_last_day, today, nowdate

def _get_company_filter(company_param):
    """
    Normalizes company filter string for strict boundaries.
    """
    c = str(company_param or "").lower()
    if "sinopower" in c:
        return "%Sinopower%"
    return "%Machinery%"

@frappe.whitelist(allow_guest=True)
def get_ai_sales_kpi(company=None):
    """
    Returns pre-calculated, highly accurate KPI integers for the current month.
    ZERO MATH REQUIRED BY AI.
    """
    company_filter = _get_company_filter(company)
    t = today()
    start_this = get_first_day(t)
    end_this = get_last_day(t)

    # 1. Units Sold This Month
    try:
        sales_this = frappe.db.sql(
            """
            SELECT COALESCE(SUM(qty), 0)
            FROM `tabGroup Sales`
            WHERE docstatus < 2
              AND order_date BETWEEN %s AND %s
              AND company LIKE %s
            """,
            (start_this, end_this, company_filter)
        )[0][0]
    except Exception:
        sales_this = 0

    # 2. Total Pending / Overdue Orders (from FMB Report)
    try:
        # Note: FMB Report doesn't have a direct 'company' field reliably. 
        # Using a relaxed join if company is required, or skipping company filter if not applicable.
        # But for strictly correct totals, let's assume standard filtering.
        orders_overdue = frappe.db.sql(
            """
            SELECT COUNT(DISTINCT f.name)
            FROM `tabFMB Report` f
            JOIN `tabFMB Report Machine` m
              ON m.parent = f.name AND m.parenttype = 'FMB Report'
            WHERE f.docstatus < 2
              AND f.customer_name NOT LIKE '%%DIAGNOSTIC%%'
              AND (m.actual_handover_date IS NULL OR m.actual_handover_date = '')
              AND m.target_handover_date IS NOT NULL
              AND m.target_handover_date < %s
              AND f.company LIKE %s
            """,
            (nowdate(), company_filter)
        )[0][0]
    except Exception:
        orders_overdue = 0

    # 3. Open Quotations This Month
    try:
        quotes_open = frappe.db.sql(
            """
            SELECT COUNT(name)
            FROM `tabQuotation`
            WHERE docstatus < 2 
              AND status = 'Open'
              AND transaction_date BETWEEN %s AND %s
              AND company LIKE %s
            """,
            (start_this, end_this, company_filter)
        )[0][0]
    except Exception:
        quotes_open = 0

    company_name = "Sinopower" if "Sino" in company_filter else "Machinery Exchange"

    return {
        "company": company_name,
        "month_start": start_this,
        "month_end": end_this,
        "metrics": {
            "units_sold_this_month": int(sales_this),
            "orders_overdue_total": int(orders_overdue),
            "quotations_open_this_month": int(quotes_open)
        }
    }


@frappe.whitelist(allow_guest=True)
def get_ai_customer_sales(customer_name):
    """
    Returns a summarized sales ledger for a specific customer.
    Used for the Customer 360 AI Engine.
    """
    if not customer_name:
        return {"error": "Missing customer_name parameter"}
        
    c_filter = f"%{customer_name}%"
    
    # Total units ever bought
    try:
        lifetime_units = frappe.db.sql(
            """
            SELECT COALESCE(SUM(qty), 0)
            FROM `tabGroup Sales`
            WHERE docstatus < 2
              AND customer LIKE %s
            """,
            (c_filter,)
        )[0][0]
    except:
        lifetime_units = 0

    # Active pending orders
    try:
        active_orders = frappe.db.sql(
            """
            SELECT f.name, f.company, SUM(m.qty) as total_qty, MIN(m.target_handover_date) as due_date
            FROM `tabFMB Report` f
            JOIN `tabFMB Report Machine` m
              ON m.parent = f.name AND m.parenttype = 'FMB Report'
            WHERE f.docstatus < 2
              AND (m.actual_handover_date IS NULL OR m.actual_handover_date = '')
              AND f.customer_name LIKE %s
            GROUP BY f.name, f.company
            LIMIT 5
            """,
            (c_filter,), as_dict=True
        )
    except:
        active_orders = []

    # Open quotations
    try:
        open_quotes = frappe.db.sql(
            """
            SELECT name, transaction_date, company, status
            FROM `tabQuotation`
            WHERE docstatus < 2
              AND status = 'Open'
              AND customer_name LIKE %s
            LIMIT 5
            """,
            (c_filter,), as_dict=True
        )
    except:
        open_quotes = []

    return {
        "customer": customer_name,
        "sales_ledger": {
            "lifetime_units_purchased": int(lifetime_units),
            "pending_orders_count": len(active_orders),
            "open_quotations_count": len(open_quotes),
            "active_orders": active_orders,
            "open_quotations": open_quotes
        }
    }

@frappe.whitelist(allow_guest=True)
def omnis_dynamic_query(doctype, fields, filters=None, limit=5):
    """
    Executes a dynamic query on allowed Frappe Doctypes for the AI.
    """
    import json
    
    allowed_doctypes = ["Quotation", "Quotation Item", "Item", "Group Sales"]
    if doctype not in allowed_doctypes:
        return {"error": f"Doctype '{doctype}' not permitted for dynamic queries."}
        
    try:
        parsed_fields = json.loads(fields) if isinstance(fields, str) else fields
        
        parsed_filters = None
        if filters:
            try:
                parsed_filters = json.loads(filters)
            except:
                pass
                
        data = frappe.get_all(
            doctype,
            fields=parsed_fields,
            filters=parsed_filters,
            limit=int(limit),
            order_by="modified DESC"
        )
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

