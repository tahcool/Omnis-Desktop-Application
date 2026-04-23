import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_ft_machine_register(region=None, status=None, search=None):
    """
    Get list of machines for the register view.
    """
    filters = {}
    if region:
        filters["region"] = region
    if status:
        filters["status"] = status
    
    # Base fields for the list view and report
    fields = [
        "name", "mxg_fleet_no", "fleet_no", "model", "customer", 
        "region", "status", "current_hmr", "location",
        "sn", "chassis_number", "warranty_status", 
        "commission_date", "warranty_expiry"
    ]

    # Handle search
    or_filters = []
    if search:
        or_filters = [
            ["name", "like", f"%{search}%"],
            ["mxg_fleet_no", "like", f"%{search}%"],
            ["sn", "like", f"%{search}%"],
            ["customer", "like", f"%{search}%"]
        ]

    machines = frappe.get_all(
        "FT Machine",
        filters=filters,
        or_filters=or_filters if or_filters else None,
        fields=fields,
        order_by="name asc",
        limit_page_length=100
    )

    return {"data": machines}

@frappe.whitelist(allow_guest=True)
def get_ft_machine_details(machine_id):
    """
    Get full details for a specific machine.
    """
    if not machine_id:
        frappe.throw(_("Machine ID is required"))

    # Fetch the full document to get all fields
    # We use get_doc to ensure we get child tables if needed (though the list suggests mostly flat/link fields)
    # If performance is an issue, we can switch to get_value with a long list of fields.
    try:
        doc = frappe.get_doc("FT Machine", machine_id)
        return {"data": doc.as_dict()}
    except frappe.DoesNotExistError:
        frappe.throw(_("Machine not found"))
