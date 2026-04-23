import frappe
from typing import Dict, Any, List

@frappe.whitelist(allow_guest=True)
def get_om_parts(query: str = None) -> Dict[str, Any]:
    """
    Search for parts in the OM Part catalog.
    Bypasses read permissions for Guest access.
    """
    try:
        # Robustly handle query from either GET param or POST body
        if not query:
            query = frappe.form_dict.get('query')

        # Standard Frappe Search logic using or_filters
        if query:
            parts = frappe.get_all(
                "OM Part",
                filters={
                    "part_name": ["like", f"%{query}%"]
                },
                or_filters={
                    "part_number": ["like", f"%{query}%"],
                    "model": ["like", f"%{query}%"]
                },
                fields=[
                    "name", "part_name", "part_number", "main_component", 
                    "model", "qty", "stock", "image", "index", "diagram_index"
                ],
                order_by="part_name asc",
                limit_page_length=100,
                ignore_permissions=True
            )
        else:
            # Default: Return trending/latest parts if no query
            parts = frappe.get_all(
                "OM Part",
                filters={},
                fields=[
                    "name", "part_name", "part_number", "main_component", 
                    "model", "qty", "stock", "image", "index", "diagram_index"
                ],
                order_by="creation desc",
                limit_page_length=20,
                ignore_permissions=True
            )

        # Enrich with Model Name if needed
        for p in parts:
            if p.get("model"):
                p["model_name"] = frappe.db.get_value("OM Equipment Model", p.model, "model_name") or p.model
            else:
                p["model_name"] = "General"

        return {"data": parts}
        
    except Exception as e:
        frappe.log_error(title="SPE Search API Failed", message=frappe.get_traceback())
        return {"error": str(e), "data": []}
