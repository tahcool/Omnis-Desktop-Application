
@frappe.whitelist(allow_guest=True)
def get_ft_machine_register(region: str | None = None) -> Dict[str, Any]:
    """
    Get all machines for the Machine Register.
    Bypasses read permissions for Guest/System users.
    """
    filters = {}
    if region:
        filters["region"] = region

    machines = frappe.get_all(
        "FT Machine",
        filters=filters,
        fields=[
            "name", "customer", "region", "model", "type", 
            "fleet_no", "sn", "mxg_fleet_no", "location", 
            "warranty_status", "current_hmr", "status"
        ],
        order_by="name asc",
        limit_page_length=5000,
        ignore_permissions=True
    )

    return {"data": machines}
